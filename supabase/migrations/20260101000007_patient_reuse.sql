-- =====================================================================
-- 0007 · Reutilización de paciente por correo
--
-- La 0002 declaraba en su comentario que book_appointment "crea o
-- reutiliza el paciente por correo", pero el cuerpo hacía siempre un
-- INSERT. Como patients no tenía índice único sobre el correo, cada
-- reserva de un paciente recurrente creaba una fila nueva: el historial
-- del paciente quedaba partido en N registros y el dashboard no podía
-- mostrar "todas las citas de esta persona".
--
-- El índice único sobre lower(email) es lo que hace la operación segura
-- frente a reservas concurrentes del mismo paciente: el ON CONFLICT
-- resuelve la carrera dentro de una sola sentencia en lugar de confiar en
-- un SELECT seguido de un INSERT.
--
-- NOTA sobre migraciones ya aplicadas: la 0002 no se modifica. Historial
-- inmutable; esta la corrige.
-- =====================================================================

-- Un paciente por correo. Los NULL quedan fuera del índice (Postgres los
-- considera distintos), así que las filas sin correo siguen permittedidas.
create unique index if not exists patients_email_lower_key
  on patients (lower(email));

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
    -- Distinguimos "no existe en la agenda" de "otro paciente se llevó la
    -- hora primero": el mensaje al paciente es mucho mejor con esa
    -- precisión y permite que la UI ofrezca alternativas.
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

  -- Paciente: una sola identidad por correo, actualizada en cada reserva.
  -- Si el paciente cambió de teléfono o nombre corregimos sus datos, y
  -- refrescamos consent_at porque es la reserva nueva la que lo autoriza.
  insert into patients (full_name, rut, phone, email, consent_at)
  values (p_full_name, p_rut, p_phone, lower(p_email), now())
  on conflict (lower(email)) do update
    set full_name = excluded.full_name,
        rut = coalesce(nullif(excluded.rut, ''), patients.rut),
        phone = coalesce(nullif(excluded.phone, ''), patients.phone),
        consent_at = now()
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

-- La función es SECURITY DEFINER; el permiso de ejecución explícito evita
-- depender de los defaults de privilegio del esquema tras el replace.
grant execute on function book_appointment(uuid, uuid, timestamptz, text, text, text, text, text) to authenticated, anon;
