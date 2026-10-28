alter table public.manage_token_secrets enable row level security;
revoke all on public.manage_token_secrets from public, anon, authenticated;

update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
where id = 'ficha-adjuntos';

create or replace function public.audit_log_change()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_org uuid;
  v_entity_id text;
  v_summary jsonb;
  v_action text;
  v_fields jsonb;
begin
  if tg_op = 'DELETE' then
    v_org := old.org_id;
    v_entity_id := old.id::text;
    v_summary := jsonb_build_object('event', 'delete');
  elsif tg_op = 'INSERT' then
    v_org := new.org_id;
    v_entity_id := new.id::text;
    v_summary := jsonb_build_object('event', 'insert');
  else
    v_org := new.org_id;
    v_entity_id := new.id::text;

    select coalesce(jsonb_agg(n.key order by n.key), '[]'::jsonb)
      into v_fields
      from jsonb_each(to_jsonb(new)) as n(key, value)
      join jsonb_each(to_jsonb(old)) as o(key, value) using (key)
     where n.value is distinct from o.value;

    v_summary := jsonb_build_object('changed_fields', v_fields);
  end if;

  v_action := lower(tg_op);

  if tg_op = 'UPDATE' and tg_table_name = 'encounters'
     and to_jsonb(old) ->> 'status' = 'draft'
     and to_jsonb(new) ->> 'status' = 'signed' then
    v_action := 'sign';
  end if;

  insert into audit_log (org_id, actor_id, action, entity, entity_id, summary)
  values (v_org, auth.uid(), v_action, tg_table_name, v_entity_id, v_summary);

  return coalesce(new, old);
end;
$function$;

create or replace function public.audit_patient_view_event(
  p_patient_id uuid,
  p_entity text
)
returns void
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_org uuid;
begin
  if p_entity is null or p_entity not in (
    'patients',
    'patient_export',
    'patient_pdf',
    'patient_background',
    'encounters',
    'encounter_versions',
    'attachments',
    'consents',
    'prescriptions',
    'dental_chart_entries',
    'periodontal_records',
    'dental_treatment_plan_items',
    'dental_payments'
  ) then
    raise exception using errcode = '22023', message = 'invalid_audit_entity';
  end if;

  select d.org_id
    into v_org
    from doctors d
   where d.id = auth.uid()
     and d.active
     and is_clinical();

  if v_org is null or not exists (
    select 1
      from patients p
     where p.id = p_patient_id
       and p.org_id = v_org
  ) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  insert into audit_log (org_id, actor_id, action, entity, entity_id, summary)
  values (
    v_org,
    auth.uid(),
    'view',
    p_entity,
    p_patient_id::text,
    jsonb_build_object('event', 'read')
  );
end;
$function$;

revoke all on function public.audit_patient_view_event(uuid, text) from public, anon;
grant execute on function public.audit_patient_view_event(uuid, text) to authenticated;

drop policy if exists patients_clinical_delete on public.patients;
revoke delete on public.patients from authenticated;
