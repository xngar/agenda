-- Permite al paciente cancelar su cita por internet en cualquier momento
-- antes de que comience (lower(during) > now()).
-- Si la cita ya comenzó o concluyó (lower(during) <= now()), se rechaza con A0005.

create or replace function cancel_appointment(
  p_token_hash text,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_appt appointments%rowtype;
begin
  select * into v_appt from appointments a
  where a.manage_token_hash = p_token_hash and a.status in ('pending','confirmed')
  for update;

  if not found then
    raise exception using errcode = 'A0003', message = 'token_invalido';
  end if;

  -- Si la cita ya comenzó o ya pasó, no se puede cancelar por internet
  if lower(v_appt.during) <= now() then
    raise exception using errcode = 'A0005', message = 'cita_no_modificable';
  end if;

  update appointments a
  set status = 'cancelled', cancelled_by = 'patient', cancel_reason = left(coalesce(p_reason, ''), 500)
  where a.id = v_appt.id;

  insert into notifications (doctor_id, appointment_id, type, org_id)
  values (v_appt.doctor_id, v_appt.id, 'cancelled', v_appt.org_id);

  return v_appt.id;
end;
$$;

revoke all on function cancel_appointment(text, text) from public;
grant execute on function cancel_appointment(text, text) to anon, authenticated;

-- Actualizamos el default de cancel_min_hours en organizations a 0
alter table organizations alter column cancel_min_hours set default 0;
update organizations set cancel_min_hours = 0 where cancel_min_hours = 12;
