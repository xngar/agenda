-- =====================================================================
-- 0002 · Funciones de negocio (SECURITY DEFINER, search_path fijo)
--
-- Flujo del paciente: siempre vía RPC, nunca acceso directo a tablas.
-- El token de gestión se recibe SIEMPRE como hash SHA-256 (hex).
-- La comparación se hace con = sobre un índice unique; además el
-- servidor valida longitud/formato antes de llamar (ver lib/token.ts).
--
-- Códigos de error de negocio (SQLSTATE) que el servidor traduce:
--   A0001 hora_ya_tomada      A0002 slot_no_disponible
--   A0003 token_invalido     A0004 cancelacion_fuera_de_plazo
--   A0005 cita_no_modificable
-- =====================================================================

-- Horario disponible agregando todos los doctores activos.
-- Para la opción "cualquiera disponible" del paciente.
create or replace function get_available_slots_any(p_date date, p_duration int)
returns table(doctor_id uuid, slot_start timestamptz, slot_end timestamptz)
language sql stable
set search_path = public, pg_temp
as $$
  select d.id, s.slot_start, s.slot_end
  from doctors d
  cross join lateral get_available_slots(d.id, p_date, p_duration) s
  where d.active
  order by s.slot_start, d.id;
$$;

-- Crea o reutiliza el paciente por correo (minimiza duplicados) y registra
-- la cita. Devuelve el id de la cita creada.
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
as $$
declare
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

  select s.duration_min into v_duration
  from services s join doctors d on d.id = p_doctor
  where s.id = p_service and s.active and d.active;

  if v_duration is null then
    raise exception using errcode = 'A0002', message = 'slot_no_disponible';
  end if;

  v_date := (p_start at time zone (select timezone from clinic_settings where id = 1))::date;

  -- Revalidación dentro de la misma transacción: horario, feriado,
  -- bloqueo, anticipación mínima y solapamientos ya confirmados.
  select gs.slot_start into v_slot
  from get_available_slots(p_doctor, v_date, v_duration) gs
  where gs.slot_start = p_start;

  if v_slot is null then
    -- Distinguimos "no existe en la agenda" de "alguien seonialdmás rápido":
    -- el mensaje al paciente es mucho mejor con esa precisión.
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

  insert into patients (full_name, rut, phone, email, consent_at)
  values (p_full_name, p_rut, p_phone, lower(p_email), now())
  returning id into v_patient;

  begin
    insert into appointments (doctor_id, patient_id, service_id, during, manage_token_hash)
    values (p_doctor, v_patient, p_service, tstzrange(p_start, p_start + make_interval(mins => v_duration)), p_token_hash)
    returning id into v_appointment;
  exception when exclusion_violation then
    -- Carrera: otra transacción ganó la hora entre la revalidación y el insert.
    raise exception using errcode = 'A0001', message = 'hora_ya_tomada';
  end;

  insert into notifications (doctor_id, appointment_id, type)
  values (p_doctor, v_appointment, 'new_booking');

  return v_appointment;
end;
$$;

-- Reprograma usando el token de gestión. Respeta el mismo motor de
-- disponibilidad; no exige anticipación mínima de cancelacion_min_hours
-- (solo min_notice_hours, que ya aplica get_available_slots).
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
  v_new_start timestamptz;
  v_slot timestamptz;
begin
  select * into v_appt
  from appointments a
  where a.manage_token_hash = p_token_hash
    and a.status in ('pending', 'confirmed')
  for update;

  if not found then
    raise exception using errcode = 'A0003', message = 'token_invalido';
  end if;

  if upper(during) <= now() then
    raise exception using errcode = 'A0005', message = 'cita_no_modificable';
  end if;

  if p_start is null then
    raise exception using errcode = 'A0002', message = 'slot_no_disponible';
  end if;

  select duration_min into v_duration from services where id = v_appt.service_id;
  v_doctor := coalesce(p_doctor, v_appt.doctor_id);

  v_date := (p_start at time zone (select timezone from clinic_settings where id = 1))::date;

  select gs.slot_start into v_slot
  from get_available_slots(v_doctor, v_date, v_duration) gs
  where gs.slot_start = p_start;

  if v_slot is null then
    raise exception using errcode = 'A0002', message = 'slot_no_disponible';
  end if;

  begin
    update appointments a
    set during = tstzrange(p_start, p_start + make_interval(mins => v_duration)),
        doctor_id = v_doctor
    where a.id = v_appt.id
    returning lower(during) into v_new_start;
  exception when exclusion_violation then
    raise exception using errcode = 'A0001', message = 'hora_ya_tomada';
  end;

  insert into notifications (doctor_id, appointment_id, type)
  values (v_doctor, v_appt.id, 'rescheduled');

  return v_appt.id;
end;
$$;

-- Cancelación por token. Para el paciente aplica cancel_min_hours.
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
  v_min_hours int;
begin
  select * into v_appt
  from appointments a
  where a.manage_token_hash = p_token_hash
    and a.status in ('pending', 'confirmed')
  for update;

  if not found then
    raise exception using errcode = 'A0003', message = 'token_invalido';
  end if;

  if upper(v_appt.during) <= now() then
    raise exception using errcode = 'A0005', message = 'cita_no_modificable';
  end if;

  select cancel_min_hours into v_min_hours from clinic_settings where id = 1;
  if lower(v_appt.during) < now() + make_interval(hours => v_min_hours) then
    raise exception using errcode = 'A0004', message = 'cancelacion_fuera_de_plazo';
  end if;

  update appointments a
  set status = 'cancelled', cancelled_by = 'patient', cancel_reason = left(coalesce(p_reason, ''), 500)
  where a.id = v_appt.id;

  insert into notifications (doctor_id, appointment_id, type)
  values (v_appt.doctor_id, v_appt.id, 'cancelled');

  return v_appt.id;
end;
$$;

-- ---------------------------------------------------------------------
-- Acciones del doctor sobre su propia cita. SECURITY DEFINER para que el
-- cambio de estado y la reprogramación no dependan del cliente, pero la
-- pertenencia se valida contra auth.uid().
-- ---------------------------------------------------------------------
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
begin
  select * into v_appt from appointments a where a.id = p_appointment for update;
  if not found or v_appt.doctor_id <> auth.uid() then
    raise exception using errcode = 'A0003', message = 'token_invalido';
  end if;

  if p_status not in ('pending','confirmed','cancelled','completed','no_show') then
    raise exception using errcode = 'A0002', message = 'slot_no_disponible';
  end if;

  if p_status <> v_appt.status and p_status <> 'confirmed' and upper(v_appt.during) <= now() then
    raise exception using errcode = 'A0005', message = 'cita_no_modificable';
  end if;

  if p_start is not null then
    if upper(v_appt.during) <= now() then
      raise exception using errcode = 'A0005', message = 'cita_no_modificable';
    end if;
    select duration_min into v_duration from services where id = v_appt.service_id;
    v_doctor := coalesce(p_doctor, v_appt.doctor_id);
    v_date := (p_start at time zone (select timezone from clinic_settings where id = 1))::date;

    select gs.slot_start into v_slot
    from get_available_slots(v_doctor, v_date, v_duration) gs
    where gs.slot_start = p_start;
if v_slot is null then
    if exists (
      select 1 from appointments a
      where a.doctor_id = v_doctor
        and a.id <> v_appt.id
        and a.status in ('pending', 'confirmed')
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
    where a.id = v_appt.id
  exception when exclusion_violation then
    raise exception using errcode = 'A0001', message = 'hora_ya_tomada';
  end;

    insert into notifications (doctor_id, appointment_id, type)
    values (v_doctor, v_appt.id, 'rescheduled');
  end if;

  update appointments a
  set status = p_status,
      cancelled_by = case when p_status = 'cancelled' then 'doctor' else a.cancelled_by end,
      cancel_reason = case when p_status = 'cancelled' then left(coalesce(p_reason, ''), 500) else a.cancel_reason end
  where a.id = v_appt.id;

  if p_status = 'cancelled' and p_start is null then
    insert into notifications (doctor_id, appointment_id, type)
    values (v_appt.doctor_id, v_appt.id, 'cancelled');
  end if;

  return v_appt.id;
end;
$$;

-- ---------------------------------------------------------------------
-- Recordatorios: claims las citas que necesitan aviso en las próximas
-- 24 h y las marca en el mismo paso (evita correos duplicados).
-- Ejecutar desde pg_cron o desde la Edge Function /api/cron/reminders.
-- ---------------------------------------------------------------------
create or replace function claim_due_reminders()
returns table(
  appointment_id uuid,
  doctor_id uuid,
  patient_email text,
  patient_name text,
service_name text,
  starts_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  with due as (
    select a.id, a.doctor_id, a.patient_id, a.service_id, lower(a.during) as starts_at
    from appointments a
    where a.status = 'confirmed'
      and a.reminder_sent_at is null
      and lower(a.during) between now() and now() + interval '24 hours'
    order by lower(a.during)
    limit 200
    for update skip locked
  )
  update appointments a
  set reminder_sent_at = now()
  from due d
  join patients p on p.id = d.patient_id
  left join services s on s.id = d.service_id
  where a.id = d.id
  returning a.id,
            a.doctor_id,
            p.email,
            p.full_name,
            s.name,
            d.starts_at;
$$;

comment on function claim_due_reminders() is
  'Marca reminder_sent_at en la misma transacción y devuelve lo vencido (máx. 200). El link del correo se reconstruye con decrypt_manage_token().';