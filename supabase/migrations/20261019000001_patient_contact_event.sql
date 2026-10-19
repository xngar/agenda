-- 20261019000001 · patient_contact_event
--
-- El listado de pacientes permite iniciar un contacto por WhatsApp con el
-- enlace wa.me. El envío ocurre fuera de la app (WhatsApp Web o la app), así
-- que lo único verificable es la intención: se registra un evento `contact`
-- sin guardar el cuerpo del mensaje ni datos clínicos.
--
-- audit_log no acepta INSERT desde la app (RLS + triggers SECURITY DEFINER),
-- así que esta función escribe el evento por el owner validando al llamante.

alter table audit_log drop constraint if exists audit_log_action_check;
alter table audit_log add constraint audit_log_action_check
  check (action in ('insert', 'update', 'delete', 'sign', 'export', 'view', 'contact'));

create or replace function public.patient_contact_event(
  p_patient_id uuid,
  p_channel text default 'whatsapp'
)
returns void
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_org uuid;
  v_patient_org uuid;
begin
  select d.org_id into v_org from doctors d where d.id = auth.uid();

  select p.org_id into v_patient_org from patients p where p.id = p_patient_id;

  if v_org is null or v_patient_org is null or v_patient_org <> v_org then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  insert into audit_log (org_id, actor_id, action, entity, entity_id, summary)
  values (
    v_org,
    auth.uid(),
    'contact',
    'patients',
    p_patient_id::text,
    jsonb_build_object('channel', coalesce(nullif(p_channel, ''), 'whatsapp'))
  );
end;
$function$;

revoke all on function public.patient_contact_event(uuid, text) from public, anon;
grant execute on function public.patient_contact_event(uuid, text) to authenticated;
