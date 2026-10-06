-- 20260102000002 · Actualiza RPCs para multi-tenant (Fase 3)

create or replace function get_available_slots(p_doctor uuid, p_date date, p_duration int)
returns table(slot_start timestamptz, slot_end timestamptz)
language sql stable as 
  with doc as (select org_id from doctors where id = p_doctor),
  cfg as (select o.* from organizations o join doc d on d.org_id = o.id),
  cand as (
    select gs as s, gs + make_interval(mins => p_duration) as e
    from cfg, availability_rules r,
    generate_series(
      ((p_date + r.start_time) at time zone cfg.timezone),
      ((p_date + r.end_time) at time zone cfg.timezone) - make_interval(mins => p_duration),
      make_interval(mins => cfg.slot_step_min)
    ) gs
    where r.doctor_id = p_doctor
      and r.weekday = extract(dow from p_date)
      and not exists (select 1 from clinic_holidays h where h.org_id = cfg.id and h.date = p_date)
      and p_date <= (now() at time zone cfg.timezone)::date + cfg.max_days_ahead
  )
  select s, e from cand, cfg
  where s > now() + make_interval(hours => cfg.min_notice_hours)
    and not exists (
      select 1 from appointments a
      where a.doctor_id = p_doctor and a.status in ('pending','confirmed')
        and a.during && tstzrange(s, e))
    and not exists (
      select 1 from time_off t
      where t.doctor_id = p_doctor and t.during && tstzrange(s, e))
  order by s;
;
create or replace function get_available_slots_any(p_date date, p_duration int, p_org_id uuid default null)
returns table(doctor_id uuid, slot_start timestamptz, slot_end timestamptz)
language sql stable
set search_path = public, pg_temp
as 
  select d.id, s.slot_start, s.slot_end
  from doctors d
  cross join lateral get_available_slots(d.id, p_date, p_duration) s
  where d.active and (p_org_id is null or d.org_id = p_org_id)
  order by s.slot_start, d.id;
;
create or replace function book_appointment(
  p_doctor uuid,
  p_service uuid,
  p_start timestamptz,
  p_full_name text,
  p_rut text,
  p_phone text,
  p_email text,
  p_token_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as 
declare
  v_duration int;
  v_date date;
  v_patient uuid;
  v_appointment uuid;
  v_slot timestamptz;
  v_org_id uuid;
  v_tz text;
begin
  if (p_doctor is null or p_service is null or p_start is null) then
    raise exception using errcode = 'A0002', message = 'slot_no_disponible';
  end if;
  if (p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$') then
    raise exception using errcode = 'A0003', message = 'token_invalido';
  end if;
  select s.duration_min, d.org_id into v_duration, v_org_id from services s join doctors d on d.id = p_doctor where s.id = p_service and s.active and d.active;
  if (v_duration is null) then
    raise exception using errcode = 'A0002', message = 'slot_no_disponible';
  end if;
  select timezone into v_tz from organizations where id = v_org_id;
  v_date := (p_start at time zone v_tz)::date;
  select gs.slot_start into v_slot from get_available_slots(p_doctor, v_date, v_duration) gs where gs.slot_start = p_start;
  if (v_slot is null) then
    if exists (select 1 from appointments a where a.doctor_id = p_doctor and a.status in ('pending','confirmed') and a.during && tstzrange(p_start, p_start + make_interval(mins => v_duration))) then
      raise exception using errcode = 'A0001', message = 'hora_ya_tomada';
    end if;
    raise exception using errcode = 'A0002', message = 'slot_no_disponible';
  end if;
  insert into patients (full_name, rut, phone, email, consent_at) values (p_full_name, p_rut, p_phone, lower(p_email), now()) returning id into v_patient;
  begin
    insert into appointments (doctor_id, patient_id, service_id, during, manage_token_hash, org_id) values (p_doctor, v_patient, p_service, tstzrange(p_start, p_start + make_interval(mins => v_duration)), p_token_hash, v_org_id) returning id into v_appointment;
  exception when exclusion_violation then
    raise exception using errcode = 'A0001', message = 'hora_ya_tomada';
  end;
  insert into notifications (doctor_id, appointment_id, type, org_id) values (p_doctor, v_appointment, 'new_booking', v_org_id);
  return v_appointment;
end;
;
create or replace function reschedule_appointment(
  p_token_hash text,
  p_start timestamptz,
  p_doctor uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as 
declare
  v_appt appointments%rowtype;
  v_duration int;
  v_date date;
  v_doctor uuid;
  v_slot timestamptz;
  v_tz text;
begin
  select * into v_appt from appointments a where a.manage_token_hash = p_token_hash and a.status in ('pending','confirmed') for update;
  if (not found) then raise exception using errcode = 'A0003', message = 'token_invalido'; end if;
  if (upper(v_appt.during) <= now()) then raise exception using errcode = 'A0005', message = 'cita_no_modificable'; end if;
  if (p_start is null) then raise exception using errcode = 'A0002', message = 'slot_no_disponible'; end if;
  select duration_min into v_duration from services where id = v_appt.service_id;
  v_doctor := coalesce(p_doctor, v_appt.doctor_id);
  select timezone into v_tz from organizations where id = v_appt.org_id;
  v_date := (p_start at time zone v_tz)::date;
  select gs.slot_start into v_slot from get_available_slots(v_doctor, v_date, v_duration) gs where gs.slot_start = p_start;
  if (v_slot is null) then raise exception using errcode = 'A0002', message = 'slot_no_disponible'; end if;
  begin
    update appointments a set during = tstzrange(p_start, p_start + make_interval(mins => v_duration)), doctor_id = v_doctor where a.id = v_appt.id;
  exception when exclusion_violation then
    raise exception using errcode = 'A0001', message = 'hora_ya_tomada';
  end;
  insert into notifications (doctor_id, appointment_id, type, org_id) values (v_doctor, v_appt.id, 'rescheduled', v_appt.org_id);
  return v_appt.id;
end;
;
create or replace function cancel_appointment(
  p_token_hash text,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as 
declare
  v_appt appointments%rowtype;
  v_min_hours int;
begin
  select * into v_appt from appointments a where a.manage_token_hash = p_token_hash and a.status in ('pending','confirmed') for update;
  if (not found) then raise exception using errcode = 'A0003', message = 'token_invalido'; end if;
  if (upper(v_appt.during) <= now()) then raise exception using errcode = 'A0005', message = 'cita_no_modificable'; end if;
  select cancel_min_hours into v_min_hours from organizations where id = v_appt.org_id;
  if (lower(v_appt.during) < now() + make_interval(hours => v_min_hours)) then raise exception using errcode = 'A0004', message = 'cancelacion_fuera_de_plazo'; end if;
  update appointments a set status = 'cancelled', cancelled_by = 'patient', cancel_reason = left(coalesce(p_reason,''),500) where a.id = v_appt.id;
  insert into notifications (doctor_id, appointment_id, type, org_id) values (v_appt.doctor_id, v_appt.id, 'cancelled', v_appt.org_id);
  return v_appt.id;
end;
;
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
as 
declare
  v_appt appointments%rowtype;
  v_duration int;
  v_date date;
  v_doctor uuid;
  v_slot timestamptz;
  v_tz text;
begin
  select * into v_appt from appointments a where a.id = p_appointment for update;
  if (not found or v_appt.doctor_id <> auth.uid()) then raise exception using errcode = 'A0003', message = 'token_invalido'; end if;
  if (p_status not in ('pending','confirmed','cancelled','completed','no_show')) then raise exception using errcode = 'A0002', message = 'slot_no_disponible'; end if;
  if (p_status <> v_appt.status and p_status <> 'confirmed' and upper(v_appt.during) <= now()) then raise exception using errcode = 'A0005', message = 'cita_no_modificable'; end if;
  if (p_start is not null) then
    if (upper(v_appt.during) <= now()) then raise exception using errcode = 'A0005', message = 'cita_no_modificable'; end if;
    select duration_min into v_duration from services where id = v_appt.service_id;
    v_doctor := coalesce(p_doctor, v_appt.doctor_id);
    select timezone into v_tz from organizations where id = v_appt.org_id;
    v_date := (p_start at time zone v_tz)::date;
    select gs.slot_start into v_slot from get_available_slots(v_doctor, v_date, v_duration) gs where gs.slot_start = p_start;
    if (v_slot is null) then raise exception using errcode = 'A0002', message = 'slot_no_disponible'; end if;
    begin
      update appointments a set during = tstzrange(p_start, p_start + make_interval(mins => v_duration)), doctor_id = v_doctor where a.id = v_appt.id;
    exception when exclusion_violation then
      raise exception using errcode = 'A0001', message = 'hora_ya_tomada';
    end;
    insert into notifications (doctor_id, appointment_id, type, org_id) values (v_doctor, v_appt.id, 'rescheduled', v_appt.org_id);
  end if;
  update appointments a set status = p_status, cancelled_by = case when p_status='cancelled' then 'doctor' else a.cancelled_by end, cancel_reason = case when p_status='cancelled' then left(coalesce(p_reason,''),500) else a.cancel_reason end where a.id = v_appt.id;
  if (p_status = 'cancelled' and p_start is null) then
    insert into notifications (doctor_id, appointment_id, type, org_id) values (v_appt.doctor_id, v_appt.id, 'cancelled', v_appt.org_id);
  end if;
  return v_appt.id;
end;
;
create or replace function replace_availability_rules(p_doctor uuid, p_rules jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as 
declare
  v_org_id uuid;
begin
  select org_id into v_org_id from doctors where id = p_doctor;
  if (v_org_id is null) then raise exception 'doctor_sin_org'; end if;
  delete from availability_rules where doctor_id = p_doctor;
  insert into availability_rules (doctor_id, weekday, start_time, end_time, org_id)
  select p_doctor, (r->>'weekday')::int, (r->>'startTime')::time, (r->>'endTime')::time, v_org_id
  from jsonb_array_elements(coalesce(p_rules, '[]'::jsonb)) r;
end;
;
