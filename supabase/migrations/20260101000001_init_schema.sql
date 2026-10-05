-- =====================================================================
-- 0001 · Esquema base de la clínica odontológica
-- Zona horaria única: America/Santiago (configurable en clinic_settings)
-- =====================================================================

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

create table clinic_settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'Clínica',
  timezone text not null default 'America/Santiago',
  slot_step_min int not null default 30,
  min_notice_hours int not null default 2,
  max_days_ahead int not null default 60,
  cancel_min_hours int not null default 12
);
insert into clinic_settings default values;

create table clinic_holidays (
  date date primary key,
  name text
);

create table doctors (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  specialty text,
  is_admin boolean not null default false,
  active boolean not null default true
);

create table services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_min int not null check (duration_min > 0),
  active boolean not null default true
);

create table availability_rules (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctors(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6), -- 0 = domingo, 6 = sábado
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);

create table time_off (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctors(id) on delete cascade,
  during tstzrange not null,
  reason text
);

create table patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  rut text,
  phone text,
  email text not null,
  consent_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctors(id),
  patient_id uuid not null references patients(id),
  service_id uuid references services(id),
  during tstzrange not null,
  status text not null default 'confirmed'
    check (status in ('pending','confirmed','cancelled','completed','no_show')),
  manage_token_hash text not null unique,
  cancelled_by text check (cancelled_by in ('patient','doctor')),
  cancel_reason text,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  exclude using gist (doctor_id with =, during with &&)
    where (status in ('pending','confirmed'))
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctors(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete cascade,
  type text not null, -- new_booking, rescheduled, cancelled
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Utilizada por el flujo público para elegir día y hora.
create or replace function get_available_slots(p_doctor uuid, p_date date, p_duration int)
returns table(slot_start timestamptz, slot_end timestamptz)
language sql stable as $$
  with cfg as (select * from clinic_settings where id = 1),
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
      and not exists (select 1 from clinic_holidays h where h.date = p_date)
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
$$;

comment on table patients is
  'Datos mínimos para agendar. No contiene información clínica ni de salud (Ley 19.628).';
comment on column appointments.manage_token_hash is
  'SHA-256 en hex del token de gestión. El token en claro nunca se guarda.';