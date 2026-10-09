-- 20261009000001 · audit_export_event
-- El panel de Auditoría permite descargar el historial en JSON/CSV. Esas
-- exportaciones deben quedar registradas con action='export' para que la
-- acción exista de verdad en el log. audit_log no acepta INSERT desde la app
-- (RLS + trigger SECURITY DEFINER), así que esta función lo hace por el admin:
-- valida el rol del llamador y escribe el evento en su org.

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
begin
  select d.org_id, d.is_admin, d.is_super_admin
    into v_org, v_admin, v_super
    from doctors d
   where d.id = auth.uid();

  if v_org is null or not (v_admin or v_super) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  insert into audit_log (org_id, actor_id, action, entity, entity_id, summary)
  values (v_org, auth.uid(), 'export', p_entity, p_entity_id, coalesce(p_summary, '{}'::jsonb));
end;
$function$;

revoke all on function public.audit_export_event(text, text, jsonb) from public, anon;
grant execute on function public.audit_export_event(text, text, jsonb) to authenticated;