-- 20261113160000 · Correcciones funcionales de auditoría de ficha clínica (Fase 1)
--
-- 1. Incluye `patient_id` en `summary` dentro de `audit_log_change()`,
--    `audit_appointment_change()` y `audit_patient_view_event()` para que los
--    eventos de lectura y los registros hijos eliminados conserven su vínculo
--    con el paciente.
-- 2. Permite al profesional tratante titular (`patients.doctor_id = auth.uid()`)
--    leer y exportar la auditoría de sus pacientes titulares, alineando RLS y
--    `audit_export_event` con la UI y la API.
-- 3. Agrega índice por `(org_id, entity_id)` en `audit_log` para acelerar las
--    consultas por paciente.

create index if not exists audit_log_org_entity_id_idx
  on public.audit_log (org_id, entity_id);

create or replace function public.audit_log_change()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_org uuid;
  v_entity_id text;
  v_patient_id text;
  v_summary jsonb;
  v_action text;
  v_fields jsonb;
begin
  if tg_op = 'DELETE' then
    v_org := old.org_id;
    v_entity_id := old.id::text;
    v_patient_id := coalesce(
      to_jsonb(old) ->> 'patient_id',
      case when tg_table_name = 'patients' then v_entity_id else null end
    );
    v_summary := jsonb_strip_nulls(
      jsonb_build_object('event', 'delete', 'patient_id', v_patient_id)
    );
  elsif tg_op = 'INSERT' then
    v_org := new.org_id;
    v_entity_id := new.id::text;
    v_patient_id := coalesce(
      to_jsonb(new) ->> 'patient_id',
      case when tg_table_name = 'patients' then v_entity_id else null end
    );
    v_summary := jsonb_strip_nulls(
      jsonb_build_object('event', 'insert', 'patient_id', v_patient_id)
    );
  else
    v_org := new.org_id;
    v_entity_id := new.id::text;
    v_patient_id := coalesce(
      to_jsonb(new) ->> 'patient_id',
      to_jsonb(old) ->> 'patient_id',
      case when tg_table_name = 'patients' then v_entity_id else null end
    );

    select coalesce(jsonb_agg(n.key order by n.key), '[]'::jsonb)
      into v_fields
      from jsonb_each(to_jsonb(new)) as n(key, value)
      join jsonb_each(to_jsonb(old)) as o(key, value) using (key)
     where n.value is distinct from o.value
       and n.key <> 'updated_at';

    v_summary := jsonb_strip_nulls(
      jsonb_build_object('changed_fields', v_fields, 'patient_id', v_patient_id)
    );
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

create or replace function public.audit_appointment_change()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_org uuid;
  v_entity_id text;
  v_patient_id text;
  v_tz text;
  v_summary jsonb;
begin
  if tg_op = 'DELETE' then
    v_org := old.org_id;
    v_entity_id := old.id::text;
    v_patient_id := old.patient_id::text;
    v_summary := jsonb_strip_nulls(
      jsonb_build_object(
        'evento', 'borrado',
        'estado', old.status,
        'patient_id', v_patient_id
      )
    );
  else
    v_org := new.org_id;
    v_entity_id := new.id::text;
    v_patient_id := coalesce(new.patient_id::text, old.patient_id::text);

    if new.status is not distinct from old.status
       and new.doctor_id is not distinct from old.doctor_id
       and new.during is not distinct from old.during then
      return new;
    end if;

    select timezone into v_tz from organizations where id = v_org;

    v_summary := jsonb_strip_nulls(
      jsonb_build_object(
        'evento', case
          when new.during is distinct from old.during then 'movio_hora'
          when new.doctor_id is distinct from old.doctor_id then 'cambio_profesional'
          else 'cambio_estado'
        end,
        'desde', to_char(lower(old.during) at time zone coalesce(v_tz, 'America/Santiago'), 'YYYY-MM-DD HH24:MI'),
        'hasta', to_char(lower(new.during) at time zone coalesce(v_tz, 'America/Santiago'), 'YYYY-MM-DD HH24:MI'),
        'estado_desde', old.status,
        'estado_hasta', new.status,
        'motivo', coalesce(new.cancel_reason, old.cancel_reason),
        'movio_hora', new.during is distinct from old.during,
        'patient_id', v_patient_id
      )
    );
  end if;

  insert into audit_log (org_id, actor_id, action, entity, entity_id, summary)
  values (v_org, auth.uid(), lower(tg_op), 'appointments', v_entity_id, v_summary);

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
  v_admin boolean;
  v_super boolean;
  v_doctor_id uuid;
  v_linked boolean;
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

  select d.org_id, d.is_admin, d.is_super_admin
    into v_org, v_admin, v_super
    from doctors d
   where d.id = auth.uid()
     and d.active
     and is_clinical();

  if v_org is null then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  select p.doctor_id
    into v_doctor_id
    from patients p
   where p.id = p_patient_id
     and p.org_id = v_org;

  if not found then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  if not (coalesce(v_admin, false) or coalesce(v_super, false)) then
    v_linked := (
      v_doctor_id = auth.uid()
      or exists (
        select 1
          from appointments a
         where a.org_id = v_org
           and a.patient_id = p_patient_id
           and a.doctor_id = auth.uid()
      )
      or exists (
        select 1
          from encounters e
         where e.org_id = v_org
           and e.patient_id = p_patient_id
           and e.doctor_id = auth.uid()
      )
    );
    if not v_linked then
      raise exception using errcode = '42501', message = 'forbidden';
    end if;
  end if;

  insert into audit_log (org_id, actor_id, action, entity, entity_id, summary)
  values (
    v_org,
    auth.uid(),
    'view',
    p_entity,
    p_patient_id::text,
    jsonb_build_object('event', 'read', 'patient_id', p_patient_id::text)
  );
end;
$function$;

create or replace function public.audit_export_event(
  p_entity text,
  p_entity_id text,
  p_summary jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_org uuid;
  v_admin boolean;
  v_super boolean;
  v_is_treating boolean := false;
begin
  select d.org_id, d.is_admin, d.is_super_admin
    into v_org, v_admin, v_super
    from doctors d
   where d.id = auth.uid()
     and d.active;

  if v_org is not null and p_entity_id is not null and is_clinical() then
    v_is_treating := exists (
      select 1
        from patients p
       where p.org_id = v_org
         and p.id::text = p_entity_id
         and p.doctor_id = auth.uid()
    );
  end if;

  if v_org is null or not (coalesce(v_admin, false) or coalesce(v_super, false) or v_is_treating) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  insert into audit_log (org_id, actor_id, action, entity, entity_id, summary)
  values (
    v_org,
    auth.uid(),
    'export',
    p_entity,
    p_entity_id,
    coalesce(p_summary, '{}'::jsonb)
  );
end;
$function$;

create or replace function public.can_treating_doctor_read_audit(
  p_org_id uuid,
  p_entity text,
  p_entity_id text,
  p_summary jsonb
)
returns boolean
language sql
stable
security definer
set search_path = 'public', 'pg_temp'
as $function$
  select exists (
    select 1
      from patients p
     where p.org_id = p_org_id
       and p.doctor_id = auth.uid()
       and (
         p.id::text = p_entity_id
         or p.id::text = (p_summary ->> 'patient_id')
         or (p_entity = 'encounters' and exists (
           select 1 from encounters r where r.org_id = p_org_id and r.patient_id = p.id and r.id::text = p_entity_id
         ))
         or (p_entity = 'encounter_versions' and exists (
           select 1 from encounter_versions r where r.org_id = p_org_id and r.patient_id = p.id and r.id::text = p_entity_id
         ))
         or (p_entity = 'attachments' and exists (
           select 1 from attachments r where r.org_id = p_org_id and r.patient_id = p.id and r.id::text = p_entity_id
         ))
         or (p_entity = 'consents' and exists (
           select 1 from consents r where r.org_id = p_org_id and r.patient_id = p.id and r.id::text = p_entity_id
         ))
         or (p_entity = 'prescriptions' and exists (
           select 1 from prescriptions r where r.org_id = p_org_id and r.patient_id = p.id and r.id::text = p_entity_id
         ))
         or (p_entity = 'dental_chart_entries' and exists (
           select 1 from dental_chart_entries r where r.org_id = p_org_id and r.patient_id = p.id and r.id::text = p_entity_id
         ))
         or (p_entity = 'dental_treatment_plan_items' and exists (
           select 1 from dental_treatment_plan_items r where r.org_id = p_org_id and r.patient_id = p.id and r.id::text = p_entity_id
         ))
         or (p_entity = 'dental_payments' and exists (
           select 1 from dental_payments r where r.org_id = p_org_id and r.patient_id = p.id and r.id::text = p_entity_id
         ))
         or (p_entity = 'periodontal_records' and exists (
           select 1 from periodontal_records r where r.org_id = p_org_id and r.patient_id = p.id and r.id::text = p_entity_id
         ))
         or (p_entity = 'patient_medical_background' and exists (
           select 1 from patient_medical_background r where r.org_id = p_org_id and r.patient_id = p.id and r.id::text = p_entity_id
         ))
         or (p_entity = 'appointments' and exists (
           select 1 from appointments r where r.org_id = p_org_id and r.patient_id = p.id and r.id::text = p_entity_id
         ))
       )
  );
$function$;

revoke all on function public.can_treating_doctor_read_audit(uuid, text, text, jsonb) from public, anon;
grant execute on function public.can_treating_doctor_read_audit(uuid, text, text, jsonb) to authenticated;

drop policy if exists audit_admin_read on public.audit_log;
create policy audit_admin_read on public.audit_log
  for select to authenticated
  using (
    (is_admin() and org_id = auth_org_id())
    or is_super_admin()
    or (
      is_clinical()
      and org_id = auth_org_id()
      and can_treating_doctor_read_audit(org_id, entity, entity_id, summary)
    )
  );

