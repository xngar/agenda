-- Marca de reagendación para el panel.
--
-- Reagendar (paciente o staff) sólo mueve `during` de la misma fila de
-- `appointments`: el estado sigue pending/confirmed, así que la agenda del
-- dashboard no tiene forma de saber que esa cita se movió. Este archivo
-- agrega `appointments.rescheduled_at` y hace que las RPC que mueven hora
-- lo estampen, para que el panel resalte la cita en verde.
--
-- Aditivo: no altera migraciones anteriores, sólo agrega la columna y
-- recrea las funciones correspondientes (CREATE OR REPLACE conserva sus
-- grants; se re-aplican para no depender de ese detalle de Postgres).

alter table appointments add column rescheduled_at timestamptz;

comment on column appointments.rescheduled_at is
  'Última vez que la cita cambió de hora o profesional; null = nunca reagendada.';

-- Paciente reagenda via token de gestión (misma definición de
-- 20260102000002, sumando rescheduled_at).
create or replace function reschedule_appointment(
  p_token_hash text,
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
  where a.manage_token_hash = p_token_hash and a.status in ('pending','confirmed')
  for update;

  if not found then
    raise exception using errcode = 'A0003', message = 'token_invalido';
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
        doctor_id = v_doctor,
        rescheduled_at = now()
    where a.id = v_appt.id;
  exception when exclusion_violation then
    raise exception using errcode = 'A0001', message = 'hora_ya_tomada';
  end;

  insert into notifications (doctor_id, appointment_id, type, org_id)
  values (v_doctor, v_appt.id, 'rescheduled', v_appt.org_id);

  return v_appt.id;
end;
$$;

revoke all on function reschedule_appointment(text, timestamptz, uuid) from public;
grant execute on function reschedule_appointment(text, timestamptz, uuid) to anon, authenticated;

-- Staff reagenda desde el dashboard (misma definición de
-- 20261016000001, sumando rescheduled_at).
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
        doctor_id = v_doctor,
        rescheduled_at = now()
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

-- Cambio vía API de doctor; también puede mover hora (definición de
-- 20260102000002, sumando rescheduled_at a esa única rama).
create or replace function doctor_update_appointment(
  p_appointment uuid,
  p_status text,
  p_reason text default null,
  p_start timestamptz default null,
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
  select * into v_appt from appointments a where a.id = p_appointment for update;

  if not found or v_appt.doctor_id <> auth.uid() then
    raise exception using errcode = 'A0003', message = 'token_invalido';
  end if;

  if p_status not in ('pending','confirmed','cancelled','completed','no_show') then
    raise exception using errcode = 'A0002', message = 'slot_no_disponible';
  end if;

  if p_status <> 'confirmed' and upper(v_appt.during) <= now() then
    raise exception using errcode = 'A0005', message = 'cita_no_modificable';
  end if;

  if p_start is not null then
    if upper(v_appt.during) <= now() then
      raise exception using errcode = 'A0005', message = 'cita_no_modificable';
    end if;

    select duration_min into v_duration from services where id = v_appt.service_id;
    v_doctor := coalesce(p_doctor, v_appt.doctor_id);
    select timezone into v_tz from organizations where id = v_appt.org_id;
    v_date := (p_start at time zone v_tz)::date;

    select gs.slot_start into v_slot
    from get_available_slots(v_doctor, v_date, v_duration) gs
    where gs.slot_start = p_start;

    if v_slot is null then
      raise exception using errcode = 'A0002', message = 'slot_no_disponible';
    end if;

    begin
      update appointments a
      set during = tstzrange(p_start, p_start + make_interval(mins => v_duration)),
          doctor_id = v_doctor,
          rescheduled_at = now()
      where a.id = v_appt.id;
    exception when exclusion_violation then
      raise exception using errcode = 'A0001', message = 'hora_ya_tomada';
    end;

    insert into notifications (doctor_id, appointment_id, type, org_id)
    values (v_doctor, v_appt.id, 'rescheduled', v_appt.org_id);
  end if;

  update appointments a
  set status = p_status,
      cancelled_by = case when p_status = 'cancelled' then 'doctor' else a.cancelled_by end,
      cancel_reason = case when p_status = 'cancelled' then left(coalesce(p_reason, ''), 500) else a.cancel_reason end
  where a.id = v_appt.id;

  if p_status = 'cancelled' and p_start is null then
    insert into notifications (doctor_id, appointment_id, type, org_id)
    values (v_appt.doctor_id, v_appt.id, 'cancelled', v_appt.org_id);
  end if;

  return v_appt.id;
end;
$$;

-- Panel: citas del día y del mes, ahora con la marca (definiciones de
-- 20260101000010 y 20260107000017, sumando rescheduled_at).
create or replace function public.dashboard_appointments(p_day date, p_doctor uuid default null)
returns setof jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'id', a.id,
    'doctor_id', a.doctor_id,
    'patient_id', a.patient_id,
    'service_id', a.service_id,
    'during', a.during,
    'status', a.status,
    'cancelled_by', a.cancelled_by,
    'cancel_reason', a.cancel_reason,
    'created_at', a.created_at,
    'rescheduled_at', a.rescheduled_at,
    'patient', case when p.id is null then null else jsonb_build_object(
      'full_name', p.full_name, 'phone', p.phone, 'email', p.email, 'rut', p.rut
    ) end,
    'service', case when s.id is null then null else jsonb_build_object(
      'name', s.name, 'duration_min', s.duration_min
    ) end
  )
  from appointments a
  left join patients p on p.id = a.patient_id
  left join services s on s.id = a.service_id
  where a.during && tstzrange(
          p_day::timestamp at time zone 'America/Santiago',
          (p_day + 1)::timestamp at time zone 'America/Santiago',
          '[)'
        )
    and (p_doctor is null or a.doctor_id = p_doctor)
  order by a.during;
$$;

create or replace function public.dashboard_month_appointments(
  p_from date,
  p_to date,
  p_doctor uuid default null
)
returns setof jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'id', a.id,
    'doctor_id', a.doctor_id,
    'patient_id', a.patient_id,
    'service_id', a.service_id,
    'during', a.during,
    'status', a.status,
    'cancelled_by', a.cancelled_by,
    'cancel_reason', a.cancel_reason,
    'created_at', a.created_at,
    'rescheduled_at', a.rescheduled_at,
    'patient', case when p.id is null then null else jsonb_build_object(
      'full_name', p.full_name, 'phone', p.phone, 'email', p.email, 'rut', p.rut
    ) end,
    'service', case when s.id is null then null else jsonb_build_object(
      'name', s.name, 'duration_min', s.duration_min
    ) end
  )
  from appointments a
  left join patients p on p.id = a.patient_id
  left join services s on s.id = a.service_id
  where a.during && tstzrange(
          p_from::timestamp at time zone 'America/Santiago',
          (p_to + 1)::timestamp at time zone 'America/Santiago',
          '[)'
        )
    and (p_doctor is null or a.doctor_id = p_doctor)
  order by a.during;
$$;

grant execute on function public.dashboard_month_appointments(date, date, uuid) to authenticated;
