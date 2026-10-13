# BASE_DE_DATOS.md

## Resumen

Base de datos PostgreSQL en Supabase. Migraciones en `supabase/migrations/` con orden cronológico. Usa extensiones `btree_gist` y `pgcrypto`. Sistema multi-tenant con `org_id` en entidades principales. RLS habilitado como autoridad. Zona horaria lógica: `America/Santiago`.

## Tablas principales (versión inicial y multi-tenant)

### organizations
Tabla de organizaciones (multi-tenant). Creada en 20260102000001.

**Campos (verificables desde migraciones):**
- `id` (uuid, PK, default gen_random_uuid)
- `name` (text, not null)
- `slug` (text, not null, unique)
- `timezone` (text, not null, default 'America/Santiago')
- `slot_step_min` (int, not null, default 30)
- `min_notice_hours` (int, not null, default 2)
- `max_days_ahead` (int, not null, default 60)
- `cancel_min_hours` (int, not null, default 12)
- `address` (text, nullable)
- `phone` (text, nullable)
- `support_email` (text, nullable)
- `consent_text` (text, nullable)
- `active` (boolean, not null, default true)
- `created_at` (timestamptz, not null, default now)
- `updated_at` (timestamptz, not null, default now)

**Relaciones:** padre de doctors, services, clinic_holidays, availability_rules, time_off, appointments, notifications, pacientes/ficha vía org_id.

### clinic_settings
Configuración global (pre-multi-tenant). PK `id=1`. Migración 20260101000001.

- `id` (int, PK, check id=1, default 1)
- `name` (text, not null, default 'Clínica')
- `timezone` (text, not null, default 'America/Santiago')
- `slot_step_min` (int, not null, default 30)
- `min_notice_hours` (int, not null, default 2)
- `max_days_ahead` (int, not null, default 60)
- `cancel_min_hours` (int, not null, default 12)

**Nota:** Con multi-tenant, `organizations` reemplaza uso práctico; tabla mantenida según migraciones.

### clinic_holidays
Feriados por organización. PK compuesta `(org_id, date)` desde 20260102000001.

- `date` (date, parte de PK)
- `name` (text, nullable)
- `org_id` (uuid, FK organizations(id) ON DELETE RESTRICT, parte de PK, not null)

**Índices:** `clinic_holidays_org_id_idx`.

### doctors
Profesionales/autores. FK a auth.users(id). Tiene `org_id` desde multi-tenant.

- `id` (uuid, PK, FK auth.users(id) ON DELETE CASCADE)
- `full_name` (text, not null)
- `specialty` (text, nullable)
- `is_admin` (boolean, not null, default false)
- `active` (boolean, not null, default true)
- `org_id` (uuid, FK organizations(id) ON DELETE RESTRICT, not null)
- `is_super_admin` (boolean, not null, default false)
- `role` (text/enum según ficha: puede ser 'reception' u otro; ver migraciones ficha). **POR CONFIRMAR**: tipo exacto de `role` en tabla doctors (se lee como 'reception' vs professional en código).

**Índices:** `doctors_org_id_idx`.

### services
Servicios ofrecidos.

- `id` (uuid, PK, default gen_random_uuid)
- `name` (text, not null)
- `duration_min` (int, not null, check > 0)
- `active` (boolean, not null, default true)
- `org_id` (uuid, FK organizations(id) ON DELETE RESTRICT, not null)

**Índices:** `services_org_id_active_idx`.

### availability_rules
Reglas semanales de disponibilidad por doctor/org.

- `id` (uuid, PK, default gen_random_uuid)
- `doctor_id` (uuid, FK doctors(id) ON DELETE CASCADE, not null)
- `weekday` (int, not null, check 0-6; 0=domingo según comentario migración 0001)
- `start_time` (time, not null)
- `end_time` (time, not null)
- `org_id` (uuid, FK organizations(id) ON DELETE CASCADE, not null)
- `check (end_time > start_time)`

**Índices:** `availability_rules_org_id_doctor_weekday_idx`.

### time_off
Bloqueos/ausencias.

- `id` (uuid, PK, default gen_random_uuid)
- `doctor_id` (uuid, FK doctors(id) ON DELETE CASCADE, not null)
- `during` (tstzrange, not null)
- `reason` (text, nullable)
- `org_id` (uuid, FK organizations(id) ON DELETE CASCADE, not null)

**Índices:** `time_off_org_id_doctor_idx`.

### patients
Pacientes (mínimos para agendar). Comentario: sin info clínica/salud (Ley 19.628).

- `id` (uuid, PK, default gen_random_uuid)
- `full_name` (text, not null)
- `rut` (text, nullable) - normalizado en lógica
- `phone` (text, nullable)
- `email` (text, not null)
- `consent_at` (timestamptz, not null)
- `created_at` (timestamptz, not null, default now)
- Migraciones ficha añaden: `birth_date`, `sex`, `patient_status` (active/inactive/abandoned?), `doctor_id` (owner?), `org_id`, etc. **POR CONFIRMAR**: estructura exacta final tras todas las migraciones ficha (ver 20260102000005_ficha_org_type_patients.sql y posteriores).

**Índices/constraints:** ver migraciones (incluye ajustes unicidad email/RUT según contexto).

### appointments
Citas.

- `id` (uuid, PK, default gen_random_uuid)
- `doctor_id` (uuid, FK doctors(id), not null)
- `patient_id` (uuid, FK patients(id), not null)
- `service_id` (uuid, FK services(id), nullable)
- `during` (tstzrange, not null)
- `status` (text, not null, default 'pending', check in ('pending','confirmed','cancelled','completed','no_show'))
- `manage_token_hash` (text, not null, unique) - SHA-256 hex del token en claro
- `cancelled_by` (text, check in ('patient','doctor'), nullable)
- `cancel_reason` (text, nullable)
- `reminder_sent_at` (timestamptz, nullable)
- `created_at` (timestamptz, not null, default now)
- `org_id` (uuid, FK organizations(id) ON DELETE RESTRICT, not null)

**Constraints/índices únicos:**
- Excluir solapamiento para citas activas: `exclude using gist (doctor_id with =, during with &&) where (status in ('pending','confirmed'))` (migración 0001)
- Índices: `appointments_org_id_during_idx`, `appointments_org_id_idx`

### notifications
Notificaciones al doctor.

- `id` (uuid, PK, default gen_random_uuid)
- `doctor_id` (uuid, FK doctors(id) ON DELETE CASCADE, not null)
- `appointment_id` (uuid, FK appointments(id) ON DELETE CASCADE, nullable)
- `type` (text, not null) - valores: 'new_booking', 'rescheduled', 'cancelled' (según uso)
- `read_at` (timestamptz, nullable)
- `created_at` (timestamptz, not null, default now)
- `org_id` (uuid, FK organizations(id) ON DELETE CASCADE, not null)

**Índices:** `notifications_org_id_idx`.
