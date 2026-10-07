-- 20260102000005 · Ficha clínica: tipo de organización y migración de pacientes
--
-- 1) organizations.type: define qué ficha (dental / medical / psychological)
--    usan todos los profesionales y pacientes de esa clínica.
-- 2) doctors.role: 'professional' (acceso clínico) frente a 'reception'
--    (sólo contacto y agenda). is_admin/is_super_admin no cambian.
-- 3) patients pasa a pertenecer a una organización y crece con el núcleo
--    común de la ficha: datos demográficos, previsión, contacto de
--    emergencia, tutor, estado y perfil de especialidad en jsonb.

-- ---------------------------------------------------------------------------
-- organizations.type
-- ---------------------------------------------------------------------------
create type organization_type as enum ('dental', 'medical', 'psychological');

alter table organizations
  add column type organization_type not null default 'dental';

-- ---------------------------------------------------------------------------
-- doctors.role
-- ---------------------------------------------------------------------------
alter table doctors
  add column role text not null default 'professional'
  check (role in ('professional', 'reception'));

-- ---------------------------------------------------------------------------
-- patients: núcleo común de la ficha
-- ---------------------------------------------------------------------------
alter table patients add column org_id uuid references organizations(id);

alter table patients add column nombres text;
alter table patients add column apellido_paterno text;
alter table patients add column apellido_materno text;
alter table patients add column birth_date date;
alter table patients add column sex text
  check (sex in ('female', 'male', 'other', 'undisclosed'));
alter table patients add column nationality text;
alter table patients add column marital_status text
  check (marital_status in ('single', 'married', 'widowed', 'divorced', 'other'));
alter table patients add column occupation text;
alter table patients add column address text;
alter table patients add column comuna text;
alter table patients add column region text;

alter table patients add column prevision_type text
  check (prevision_type in ('fonasa', 'isapre', 'particular', 'other'));
alter table patients add column fonasa_tramo text
  check (fonasa_tramo in ('A', 'B', 'C', 'D'));
alter table patients add column isapre_name text;
alter table patients add column isapre_plan text;

alter table patients add column emergency_name text;
alter table patients add column emergency_relation text;
alter table patients add column emergency_phone text;
alter table patients add column tutor_name text;
alter table patients add column tutor_rut text;
alter table patients add column tutor_relation text;
alter table patients add column tutor_phone text;

alter table patients add column referral_source text;
alter table patients add column patient_status text not null default 'active'
  check (patient_status in ('active', 'inactive', 'abandoned'));
alter table patients add column admitted_at date not null default current_date;
alter table patients add column specialty_profile jsonb not null default '{}'::jsonb
  check (jsonb_typeof(specialty_profile) = 'object');
alter table patients add column updated_at timestamptz not null default now();

-- El correo no siempre se conoce al abrir una ficha.
alter table patients alter column email drop not null;

-- ---------------------------------------------------------------------------
-- Asignar la organización de cada paciente desde su primera cita.
-- ---------------------------------------------------------------------------
update patients p
set org_id = primer.org_id
from (
  select distinct on (a.patient_id) a.patient_id, a.org_id
  from appointments a
  where a.org_id is not null
  order by a.patient_id, a.created_at asc nulls last
) primer
where p.id = primer.patient_id and p.org_id is null;

-- Huérfanos (sin citas): van a la clínica demo para no quedar sin ficha.
update patients p
set org_id = o.id
from organizations o
where p.org_id is null
  and o.slug = 'sonrisa-dental';

alter table patients alter column org_id set not null;

-- ---------------------------------------------------------------------------
-- Normalizar RUT y consolidar duplicados por organización.
-- ---------------------------------------------------------------------------
update patients
set rut = upper(regexp_replace(trim(rut), '[^0-9kK]', '', 'g'))
where rut is not null and trim(rut) <> '';

do $$
declare fila record;
begin
  for fila in
    select org_id, lower(rut) as llave, (array_agg(id order by id))[1] as mantener
    from patients
    where rut is not null and rut <> ''
    group by org_id, lower(rut)
    having count(*) > 1
  loop
    update appointments
    set patient_id = fila.mantener
    where patient_id in (
      select id from patients
      where org_id = fila.org_id and lower(rut) = fila.llave and id <> fila.mantener
    );
    delete from patients
    where org_id = fila.org_id and lower(rut) = fila.llave and id <> fila.mantener;
  end loop;
end $$;

-- Mejor esfuerzo: separar full_name heredado en nombres / apellido paterno /
-- apellido materno (la ficha permite corregir estos campos).
with partidos as (
  select id, regexp_split_to_array(trim(full_name), E'\\s+') as pz
  from patients
)
update patients p
set
  apellido_materno = case when cardinality(partidos.pz) >= 3
                          then partidos.pz[cardinality(partidos.pz)] end,
  apellido_paterno = case when cardinality(partidos.pz) >= 2
                          then partidos.pz[cardinality(partidos.pz) - 1] end,
  nombres = case
              when cardinality(partidos.pz) = 1 then partidos.pz[1]
              else array_to_string(partidos.pz[1:cardinality(partidos.pz) - 2], ' ')
            end,
  full_name = case when cardinality(partidos.pz) = 1
                   then partidos.pz[1]
                   else concat_ws(' ',
                     case when cardinality(partidos.pz) >= 3
                          then array_to_string(partidos.pz[1:cardinality(partidos.pz) - 2], ' ')
                          else partidos.pz[1] end,
                     case when cardinality(partidos.pz) >= 2
                          then partidos.pz[cardinality(partidos.pz) - 1] end,
                     case when cardinality(partidos.pz) >= 3
                          then partidos.pz[cardinality(partidos.pz)] end)
                   end
from partidos
where p.id = partidos.id;

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
create index patients_org_idx on patients (org_id);
create unique index patients_org_rut_uq on patients (org_id, lower(rut))
  where rut is not null and rut <> '';
create index patients_org_admitted_idx on patients (org_id, admitted_at desc);

-- ---------------------------------------------------------------------------
-- La identidad del paciente pasa a ser por organización: la misma persona
-- puede estar en dos clínicas sin compartir ficha.
-- ---------------------------------------------------------------------------
drop index if exists patients_email_lower_key;
create unique index patients_org_email_uq on patients (org_id, lower(email))
  where email is not null and trim(email) <> '';

-- ---------------------------------------------------------------------------
-- book_appointment: los pacientes ya pertenecen a una organización (org_id
-- NOT NULL) y la zona horaria ya no vive en clinic_settings (eliminada).
-- ---------------------------------------------------------------------------
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

  -- Paciente: una sola identidad por correo DENTRO de cada organización.
  -- Si el paciente cambió de teléfono o nombre corregimos sus datos, y
  -- refrescamos consent_at porque es la reserva nueva la que lo autoriza.
  insert into patients (org_id, full_name, rut, phone, email, consent_at)
  values (v_org, p_full_name, p_rut, p_phone, lower(p_email), now())
  on conflict (org_id, lower(email)) do update
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