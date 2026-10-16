-- Reagendar por id para el equipo (dashboard): misma lógica transaccional
-- que reschedule_appointment, pero localizada por appointment id en vez de
-- por token de gestión. La autorización (admin/recepción → cualquier
-- profesional; profesional → sólo la suya) vive en la API, no acá: esta
-- función es SECURITY DEFINER y sólo la puede ejecutar un rol autenticado.
--
-- Revalida el slot contra get_available_slots dentro de la transacción y
-- respeta la exclusión anti solapamiento, igual que la reserva pública, así
-- que una reprogramación del staff no puede colisionar con una reserva web
-- simultánea.

create or replace function reschedule_appointment_by_id(
  p_appointment uuid,
  p_start timestamptz,
  p_doctor uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_appt appointments%rowtype;
  v_duration int;
  v_date date;
  v_doctor uuid;
  v_slot timestamptz;
  v_tz text;
begin
  select * into v_appt from appointments a
  where a.id = p_appointment and a.status in ('pending','confirmed')
  for update;

  if not found then
    raise exception using errcode = 'A0003', message = 'cita_no_modificable';
  end if;
  if upper(v_appt.during) <= now() then
    raise exception using errcode = 'A0005', message = 'cita_no_modificable';
  end if;
  if p_start is null then
    raise exception using errcode = 'A0002', message = 'slot_no_disponible';
  end if;

  select duration_min into v_duration from services where id = v_appt.service_id;
  v_doctor := coalesce(p_doctor, v_appt.doctor_id);
  select timezone into v_tz from organizations where id = v_appt.org_id;
  v_date := (p_start at time zone v_tz)::date;

  select gs.slot_start into v_slot
  from get_available_slots(v_doctor, v_date, v_duration) gs
  where gs.slot_start = p_start;

  if v_slot is null then
    if exists (
      select 1 from appointments a
      where a.doctor_id = v_doctor
        and a.id <> v_appt.id
        and a.status in ('pending','confirmed')
        and a.during && tstzrange(p_start, p_start + make_interval(mins => v_duration))
    ) then
      raise exception using errcode = 'A0001', message = 'hora_ya_tomada';
    end if;
    raise exception using errcode = 'A0002', message = 'slot_no_disponible';
  end if;

  begin
    update appointments a
    set during = tstzrange(p_start, p_start + make_interval(mins => v_duration)),
        doctor_id = v_doctor
    where a.id = v_appt.id;
  exception when exclusion_violation then
    raise exception using errcode = 'A0001', message = 'hora_ya_tomada';
  end;

  insert into notifications (doctor_id, appointment_id, type, org_id)
  values (v_doctor, v_appt.id, 'rescheduled', v_appt.org_id);

  return v_appt.id;
end;
$$;

revoke all on function reschedule_appointment_by_id(uuid, timestamptz, uuid) from public, anon;
grant execute on function reschedule_appointment_by_id(uuid, timestamptz, uuid) to authenticated;
