-- book_appointment (SECURITY DEFINER) insertaba en `appointments` sin
-- `org_id`, pero appointments.org_id es NOT NULL desde la migración
-- multi-tenant. Además el ON CONFLICT de pacientes usaba un índice parcial
-- (ver 00012). Se redefine completa y en bloque:
--   • inserta org_id = v_org en appointments
--   • reinvalida el slot contra el rango real (tstzrange) tras el conflicto
create or replace function public.book_appointment(
  p_doctor uuid,
  p_service uuid,
  p_start timestamptz,
  p_full_name text,
  p_rut text,
  p_phone text,
  p_email text,
  p_token_hash text
) returns uuid
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
begin
  if p_doctor is null or p_service is null or p_start is null then
    raise exception using errcode = 'A0002', message = 'slot_no_disponible';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = 'A0003', message = 'token_invalido';
  end if;

  select s.duration_min, d.org_id into v_duration, v_org
  from services s join doctors d on d.id = p_doctor
  where s.id = p_service and s.active and d.active;

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

  insert into patients (org_id, full_name, rut, phone, email, consent_at)
  values (v_org, p_full_name, p_rut, p_phone, lower(p_email), now())
  on conflict (org_id, lower(email)) do update
    set full_name = excluded.full_name,
        rut = coalesce(nullif(excluded.rut, ''), patients.rut),
        phone = coalesce(nullif(excluded.phone, ''), patients.phone),
        consent_at = now()
  returning id into v_patient;

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