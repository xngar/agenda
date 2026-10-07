-- Causas raíz de rotura de las reservas públicas tras la migración de ficha:
--   1. book_appointment guardaba el RUT con separadores ("12.345.678-5"), pero
--      el flujo clínico lo guarda canónico (sólo dígitos + K). El índice único
--      `patients_org_rut_uq` (lower(rut)) los trataba como distinto RUT → la
--      misma persona terminaba con dos filas y las nuevas reservas chocaban
--      con 23505 (→ error 400 "horario no disponible").
--   2. book_appointment sólo hacía ON CONFLICT por email; un email nuevo con
--      RUT ya registrado reventaba el único de RUT.
--
-- Solución en bloque:
--   a. Normalizar los RUT guardados al canónico (dígitos + K mayúscula),
--      idéntico a lib/rut.normalizeRut().
--   b. Fusionar los duplicados que esa normalización expone (se conserva la
--      fila más antigua y se repunta toda referencia hija).
--   c. Devolver el único de RUT a su forma expresiva
--      `(org_id, regexp_replace(upper(rut),'[^0-9K]','','g'))` para que el
--      ON CONFLICT funcione con independencia de guiones/puntos.
--   d. book_appointment: dos vías de ON CONFLICT (email y RUT canónico).

-- El índice anterior (lower(rut)) impediría normalizar las filas duplicadas,
-- así que se suelta primero y se recrea al final con forma expresiva.
drop index if exists public.patients_org_rut_uq;

-- a) Canonicalizar RUT (mismo formato que lib/rut.normalizeRut).
update patients
set rut = regexp_replace(upper(rut), '[^0-9K]', '', 'g')
where rut is not null and rut <> '';

-- b) Fusionar duplicados por (org_id, rut canónico), conservando la más antigua.
drop table if exists _agenda_dup_ruts;
create temp table _agenda_dup_ruts as
select id,
       org_id,
       regexp_replace(upper(rut), '[^0-9K]', '', 'g') as norm,
       row_number() over (
         partition by org_id, regexp_replace(upper(rut), '[^0-9K]', '', 'g')
         order by created_at, id
       ) as rn,
       first_value(id) over (
         partition by org_id, regexp_replace(upper(rut), '[^0-9K]', '', 'g')
         order by created_at, id
       ) as keep_id
from patients
where rut is not null and rut <> '';

update appointments a set patient_id = d.keep_id
from _agenda_dup_ruts d where a.patient_id = d.id and d.rn > 1;

update attachments a set patient_id = d.keep_id
from _agenda_dup_ruts d where a.patient_id = d.id and d.rn > 1;

update consents c set patient_id = d.keep_id
from _agenda_dup_ruts d where c.patient_id = d.id and d.rn > 1;

update dental_chart_entries c set patient_id = d.keep_id
from _agenda_dup_ruts d where c.patient_id = d.id and d.rn > 1;

update dental_treatment_plan_items p set patient_id = d.keep_id
from _agenda_dup_ruts d where p.patient_id = d.id and d.rn > 1;

update encounter_versions v set patient_id = d.keep_id
from _agenda_dup_ruts d where v.patient_id = d.id and d.rn > 1;

update encounters e set patient_id = d.keep_id
from _agenda_dup_ruts d where e.patient_id = d.id and d.rn > 1;

update patient_medical_background b set patient_id = d.keep_id
from _agenda_dup_ruts d where b.patient_id = d.id and d.rn > 1;

update periodontal_records r set patient_id = d.keep_id
from _agenda_dup_ruts d where r.patient_id = d.id and d.rn > 1;

update prescriptions p set patient_id = d.keep_id
from _agenda_dup_ruts d where p.patient_id = d.id and d.rn > 1;

delete from patients p using _agenda_dup_ruts d
where p.id = d.id and d.rn > 1;

drop table _agenda_dup_ruts;

-- c) Índice único expresivo, insensible a separadores y que conserva la K.
create unique index patients_org_rut_uq
  on public.patients (org_id, regexp_replace(upper(rut), '[^0-9K]', '', 'g'));

-- d) book_appointment: RUT canónico + second-chance por RUT cuando el email
-- no coincide pero el paciente ya existe en la clínica.
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

  v_rut := regexp_replace(upper(p_rut), '[^0-9K]', '', 'g');

  -- 1) Mismo email => mismo paciente (comportamiento histórico del booking).
  begin
    insert into patients (org_id, full_name, rut, phone, email, consent_at)
    values (v_org, p_full_name, v_rut, p_phone, lower(p_email), now())
    on conflict (org_id, lower(email)) do update
      set full_name = excluded.full_name,
          rut = coalesce(nullif(excluded.rut, ''), patients.rut),
          phone = coalesce(nullif(excluded.phone, ''), patients.phone),
          consent_at = now()
    returning id into v_patient;
  exception when unique_violation then
    -- 2) Email nuevo pero RUT ya registrado en la clínica => mismo paciente.
    insert into patients (org_id, full_name, rut, phone, email, consent_at)
    values (v_org, p_full_name, v_rut, p_phone, lower(p_email), now())
    on conflict (org_id, regexp_replace(upper(rut), '[^0-9K]', '', 'g')) do update
      set full_name = excluded.full_name,
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