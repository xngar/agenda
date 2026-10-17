-- Auditoría de citas: los cambios que le importan a una clínica quedan
-- registrados.
--
-- Hasta ahora `appointments` era la única tabla sensible sin trigger de
-- auditoría: reprogramar o cambiar el estado de una cita no dejaba rastro, y sin
-- embargo reprogramar le avisa por correo al paciente. Para una clínica eso es
-- justo el movimiento que hay que poder reconstruir después ("¿quién movió esta
-- hora y a qué hora?").
--
-- Este archivo es aditivo: no altera migraciones anteriores, sólo agrega el
-- trigger. La lógica de la cita (validación de slot, exclusión anti solapamiento)
-- sigue siendo la de `reschedule_appointment_by_id`; esto sólo observa.
--
-- A diferencia de `audit_log_change()`, acá:
--
--   * No se auditan los INSERT. Una reserva nueva ya deja rastro en
--     `notifications` y en la cita misma; el log es para cambios sobre citas
--     que ya existían.
--   * No se auditan los UPDATE que no cambian nada relevante. El cron de
--     recordatorios marca `reminder_sent_at` y, con un trigger genérico,
--     llenaría el log de ruido todas las noches.
--   * El resumen guarda desde/hasta en hora local de la clínica, no en UTC:
--     leer "12:30–12:50" tiene que significar la hora que vio el paciente.

create or replace function audit_appointment_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
  v_entity_id text;
  v_tz text;
  v_summary jsonb;
begin
  if tg_op = 'DELETE' then
    v_org := old.org_id;
    v_entity_id := old.id::text;
    v_summary := jsonb_build_object('evento', 'borrado', 'estado', old.status);
  else
    v_org := new.org_id;
    v_entity_id := new.id::text;

    if new.status is not distinct from old.status
       and new.doctor_id is not distinct from old.doctor_id
       and new.during is not distinct from old.during then
      -- No hubo cambio de hora, estado ni profesional: es bookkeeping
      -- (recordatorio enviado), no un movimiento de agenda.
      return new;
    end if;

    select timezone into v_tz from organizations where id = v_org;

    v_summary := jsonb_build_object(
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
      'movio_hora', new.during is distinct from old.during
    );
  end if;

  insert into audit_log (org_id, actor_id, action, entity, entity_id, summary)
  values (v_org, auth.uid(), lower(tg_op), 'appointments', v_entity_id, v_summary);

  return coalesce(new, old);
end;
$$;

drop trigger if exists appointments_audit on appointments;
create trigger appointments_audit
  after update or delete on appointments
  for each row execute function audit_appointment_change();

comment on function audit_appointment_change() is
  'Registra en audit_log los cambios de hora, estado o profesional de una cita; '
  'ignora los updates sin cambio relevante (p.ej. reminder_sent_at) y no audita inserts.';