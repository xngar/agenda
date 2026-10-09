-- Excluir recepcionistas del flujo publico de reserva (defensa en capas).
-- Patch minimo sobre las definiciones vigentes: NO reemplaza la logica actual
-- de book_appointment (normalizacion de RUT, doctor_id del paciente y manejo
-- de unique_violation), solo agrega la exigencia de role = 'professional'.

-- 1) get_available_slots: solo profesionales bookables
create or replace function get_available_slots(p_doctor uuid, p_date date, p_duration integer)
returns table(slot_start timestamptz, slot_end timestamptz)
language sql
stable
set search_path to 'public', 'pg_temp'
as $function$
  with cfg as (
    select o.*
    from organizations o
    join doctors d on d.org_id = o.id
    where d.id = p_doctor
  ),
  activo as (
    select d.id from doctors d where d.id = p_doctor and d.active and d.role = 'professional'
  ),
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
  where exists (select 1 from activo)
    and s > now() + make_interval(hours => cfg.min_notice_hours)
    and not exists (
      select 1 from appointments a
      where a.doctor_id = p_doctor and a.status in ('pending','confirmed')
        and a.during && tstzrange(s, e))
    and not exists (
      select 1 from time_off t
      where t.doctor_id = p_doctor and t.during && tstzrange(s, e))
  order by s;
$function$;

-- 2) get_available_slots_any: solo profesionales bookables
create or replace function get_available_slots_any(p_date date, p_duration integer, p_org_id uuid default null)
returns table(doctor_id uuid, slot_start timestamptz, slot_end timestamptz)
language sql
stable
set search_path = 'public', 'pg_temp'
as $$
  select d.id, s.slot_start, s.slot_end
  from doctors d
  cross join lateral get_available_slots(d.id, p_date, p_duration) s
  where d.active and d.role = 'professional' and (p_org_id is null or d.org_id = p_org_id)
  order by s.slot_start, d.id;
$$;

revoke all on function get_available_slots_any(date, integer, uuid) from public;
grant execute on function get_available_slots_any(date, integer, uuid) to anon, authenticated;

-- 3) Defensa en profundidad: book_appointment solo permite profesionales bookables
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
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_org uuid;
  v_duration int;
  v_date date;
  v_patient uuid;
  v_appointment uuid;
  v_slot timestamptz;
  v_rut text;
begin
  if p_doctor is null or p_service is null or p_start is null then
    raise exception using errcode = 'A0002', message = 'slot_no_disponible';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = 'A0003', message = 'token_invalido';
  end if;

  select s.duration_min, d.org_id into v_duration, v_org
  from services s join doctors d on d.id = p_doctor
  where s.id = p_service and s.active and d.active and d.role = 'professional';

  if v_duration is null then
    raise exception using errcode = 'A0002', message = 'slot_no_disponible';
  end if;

  v_date := (p_start at time zone (select timezone from organizations where id = v_org))::date;

  select gs.slot_start into v_slot
  from get_available_slots(p_doctor, v_date, v_duration) gs
  where gs.slot_start = p_start;

  if v_slot is null then
    if exists (
      select 1 from appointments a
      where a.doctor_id = p_doctor
        and a.status in ('pending', 'confirmed')
        and a.during && tstzrange(p_start, p_start + make_interval(mins => v_duration))
    ) then
      raise exception using errcode = 'A0001', message = 'hora_ya_tomada';
    end if;
    raise exception using errcode = 'A0002', message = 'slot_no_disponible';
  end if;

  v_rut := regexp_replace(upper(p_rut), '[^0-9K]', '', 'g');

  begin
    insert into patients (org_id, doctor_id, full_name, rut, phone, email, consent_at)
    values (v_org, p_doctor, p_full_name, v_rut, p_phone, lower(p_email), now())
    on conflict (org_id, lower(email)) do update
      set full_name = excluded.full_name,
          doctor_id = coalesce(patients.doctor_id, excluded.doctor_id),
          rut = coalesce(nullif(excluded.rut, ''), patients.rut),
          phone = coalesce(nullif(excluded.phone, ''), patients.phone),
          consent_at = now()
    returning id into v_patient;
  exception when unique_violation then
    insert into patients (org_id, doctor_id, full_name, rut, phone, email, consent_at)
    values (v_org, p_doctor, p_full_name, v_rut, p_phone, lower(p_email), now())
    on conflict (org_id, regexp_replace(upper(rut), '[^0-9K]', '', 'g')) do update
      set full_name = excluded.full_name,
          doctor_id = coalesce(patients.doctor_id, excluded.doctor_id),
          email = coalesce(nullif(excluded.email, ''), patients.email),
          phone = coalesce(nullif(excluded.phone, ''), patients.phone),
          consent_at = now()
    returning id into v_patient;
  end;

  begin
    insert into appointments (doctor_id, patient_id, service_id, during, manage_token_hash, org_id)
    values (p_doctor, v_patient, p_service, tstzrange(p_start, p_start + make_interval(mins => v_duration)), p_token_hash, v_org)
    returning id into v_appointment;
  exception when exclusion_violation then
    raise exception using errcode = 'A0001', message = 'hora_ya_tomada';
  end;

  insert into notifications (doctor_id, appointment_id, type, org_id)
  values (p_doctor, v_appointment, 'new_booking', v_org);

  return v_appointment;
end;
$function$;

grant execute on function book_appointment(uuid, uuid, timestamptz, text, text, text, text, text) to authenticated, anon;
