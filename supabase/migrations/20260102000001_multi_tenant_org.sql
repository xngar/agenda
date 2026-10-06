-- 20260102000001 · Multi-tenant: organizaciones y columnas org_id (Fase 1)
-- Multi-tenant: cada organizacion tiene su propia configuracion

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- 1. Tabla de organizaciones
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'America/Santiago',
  slot_step_min int not null default 30,
  min_notice_hours int not null default 2,
  max_days_ahead int not null default 60,
  cancel_min_hours int not null default 12,
  address text,
  phone text,
  support_email text,
  consent_text text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- 2. Crear organizacion por defecto
insert into organizations (name, slug, timezone, slot_step_min, min_notice_hours, max_days_ahead, cancel_min_hours)
select coalesce(name, 'Clinica Dental Sonrisa'), 'sonrisa-dental', coalesce(timezone, 'America/Santiago'), coalesce(slot_step_min,30), coalesce(min_notice_hours,2), coalesce(max_days_ahead,60), coalesce(cancel_min_hours,12)
from clinic_settings where id = 1
on conflict (slug) do nothing;
insert into organizations (name, slug, timezone)
values ('Clinica Dental Sonrisa', 'sonrisa-dental', 'America/Santiago')
on conflict (slug) do nothing;
update organizations set address='Av. Providencia 1234, Of. 502, Santiago', phone='+56 2 2345 6789', support_email='reservas@clinicadental.test', consent_text='Autorizo a la clinica a guardar mis datos personales (nombre, RUT, telefono y correo) unicamente para gestionar mis citas y enviarme recordatorios. No se almacenan datos clinicos ni informacion de salud en este sistema. Puedo pedir la eliminacion de mis datos en cualquier momento.' where slug='sonrisa-dental' and (address is null or phone is null or support_email is null or consent_text is null);
-- 3. Añadir columnas org_id y super_admin
alter table doctors add column if not exists org_id uuid;
alter table services add column if not exists org_id uuid;
alter table clinic_holidays add column if not exists org_id uuid;
alter table availability_rules add column if not exists org_id uuid;
alter table time_off add column if not exists org_id uuid;
alter table appointments add column if not exists org_id uuid;
alter table notifications add column if not exists org_id uuid;
alter table doctors add column if not exists is_super_admin boolean not null default false;
-- 4. Backfill
with def as (select id from organizations where slug='sonrisa-dental' limit 1)
update doctors set org_id=(select id from def) where org_id is null;
with def as (select id from organizations where slug='sonrisa-dental' limit 1)
update services set org_id=(select id from def) where org_id is null;
with def as (select id from organizations where slug='sonrisa-dental' limit 1)
update clinic_holidays set org_id=(select id from def) where org_id is null;
with def as (select id from organizations where slug='sonrisa-dental' limit 1)
update availability_rules set org_id=(select id from def) where org_id is null;
with def as (select id from organizations where slug='sonrisa-dental' limit 1)
update time_off set org_id=(select id from def) where org_id is null;
with def as (select id from organizations where slug='sonrisa-dental' limit 1)
update appointments set org_id=(select id from def) where org_id is null;
with def as (select id from organizations where slug='sonrisa-dental' limit 1)
update notifications set org_id=(select id from def) where org_id is null;
-- 5. clinic_holidays PK compuesta
alter table clinic_holidays drop constraint if exists clinic_holidays_pkey;
alter table clinic_holidays alter column org_id set not null;
alter table clinic_holidays add constraint clinic_holidays_pkey primary key (org_id, date);
alter table clinic_holidays add constraint clinic_holidays_org_id_fkey foreign key (org_id) references organizations(id) on delete restrict;

-- 6. FKs y NOT NULL
alter table doctors alter column org_id set not null;
alter table doctors add constraint doctors_org_id_fkey foreign key (org_id) references organizations(id) on delete restrict;
alter table services alter column org_id set not null;
alter table services add constraint services_org_id_fkey foreign key (org_id) references organizations(id) on delete restrict;
alter table availability_rules alter column org_id set not null;
alter table availability_rules add constraint availability_rules_org_id_fkey foreign key (org_id) references organizations(id) on delete cascade;
alter table time_off alter column org_id set not null;
alter table time_off add constraint time_off_org_id_fkey foreign key (org_id) references organizations(id) on delete cascade;
alter table appointments alter column org_id set not null;
alter table appointments add constraint appointments_org_id_fkey foreign key (org_id) references organizations(id) on delete restrict;
create index if not exists appointments_org_id_during_idx on appointments using gist (org_id, during);
alter table notifications alter column org_id set not null;
alter table notifications add constraint notifications_org_id_fkey foreign key (org_id) references organizations(id) on delete cascade;

-- 7. Indices
create index if not exists doctors_org_id_idx on doctors (org_id);
create index if not exists services_org_id_active_idx on services (org_id, active);
create index if not exists clinic_holidays_org_id_idx on clinic_holidays (org_id);
create index if not exists availability_rules_org_id_doctor_weekday_idx on availability_rules (org_id, doctor_id, weekday);
create index if not exists time_off_org_id_doctor_idx on time_off (org_id, doctor_id);
create index if not exists appointments_org_id_idx on appointments (org_id);
create index if not exists notifications_org_id_idx on notifications (org_id);
