-- El trigger de auditoría sólo guardaba los DML genéricos (insert/update/delete).
-- Cuando una atención pasa de borrador a firmada, el panel debe poder ver un
-- evento explícito `sign` (quién y cuándo), no un `update` genérico.
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
begin
  if tg_op = 'DELETE' then
    v_org := old.org_id;
    v_entity_id := old.id::text;
    v_summary := to_jsonb(old);
  else
    v_org := new.org_id;
    v_entity_id := new.id::text;
    v_summary := to_jsonb(new);
  end if;

  v_action := lower(tg_op);

  if tg_op = 'UPDATE' and tg_table_name = 'encounters'
     and to_jsonb(old) ->> 'status' = 'draft' and to_jsonb(new) ->> 'status' = 'signed' then
    v_action := 'sign';
  end if;

  insert into audit_log (org_id, actor_id, action, entity, entity_id, summary)
  values (v_org, auth.uid(), v_action, tg_table_name, v_entity_id, v_summary);

  return coalesce(new, old);
end;
$function$;