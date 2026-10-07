-- Cada paciente pertenece a un médico de la organización ("dueño"):
--   - el médico que lo registra desde el panel;
--   - el médico de la cita cuando el paciente reserva online (sin robar un
--     dueño ya asignado);
--   - nadie (null) para datos históricos → sólo gestiona el admin.
-- El resto del equipo clínico puede VER todos los pacientes de la org, pero
-- sólo el dueño (o el admin) puede registrar/editar/borrar. La ficha clínica
-- y el resto de las tablas de la ficha siguen a nivel organización.

alter table public.patients add column doctor_id uuid references public.doctors(id) on delete set null;

create index patients_org_doctor_idx on public.patients (org_id, doctor_id);

-- Backfill: el dueño inicial es el médico de la cita activa más reciente.
update public.patients p
set doctor_id = t.doctor_id
from (
  select distinct on (a.patient_id)
         a.patient_id, a.doctor_id
  from public.appointments a
  where a.status <> 'cancelled'
  order by a.patient_id, a.during desc
) t
where t.patient_id = p.id;

-- RLS: la lectura sigue siendo de todo el equipo clínico de la org.
drop policy if exists patients_clinical_manage on public.patients;

create policy patients_clinical_insert on public.patients
  for insert to authenticated
  with check (org_id = auth_org_id() and is_clinical()
              and (doctor_id = auth.uid() or is_admin()));

create policy patients_clinical_update on public.patients
  for update to authenticated
  using (org_id = auth_org_id() and is_clinical()
         and (doctor_id = auth.uid() or is_admin()))
  with check (org_id = auth_org_id() and is_clinical()
              and (doctor_id = auth.uid() or is_admin()));

create policy patients_clinical_delete on public.patients
  for delete to authenticated
  using (org_id = auth_org_id() and is_clinical()
         and (doctor_id = auth.uid() or is_admin()));

-- La recepción sigue leyendo solo contacto vía su vista (aún válida al no
-- depender de doctor_id).

-- El paciente que reserva online queda asignado al médico de la cita,
-- preservando un dueño ya existente (coalesce).
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
    -- 2) Email nuevo pero RUT ya registrado en la clínica => mismo paciente.
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