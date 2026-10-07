-- 20260102000006 · Ficha clínica: tablas del núcleo común
--
-- Todas las organizaciones comparten: antecedentes (1:1 con paciente),
-- atenciones (encounters) con versionado de firmas, adjuntos, consentimientos,
-- recetas y registro de auditoría. Lo específico de cada especialidad vive en
-- jsonb (patients.specialty_profile, encounters.specialty_data) y en tablas
-- propias (ver 00007 para odontología).

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Catálogo de tipos de organización (etiquetas visibles para la UI).
-- Las definiciones de campos en sí viven en el código (lib/ficha/).
-- ---------------------------------------------------------------------------
create table organization_types (
  code organization_type primary key,
  label text not null,
  schema_version text not null default '1'
);

insert into organization_types (code, label, schema_version) values
  ('dental', 'Odontológica', '1'),
  ('medical', 'Médica', '1'),
  ('psychological', 'Psicológica', '1')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Antecedentes generales (anamnesis) del paciente
-- ---------------------------------------------------------------------------
create table patient_medical_background (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete restrict,
  patient_id uuid not null references patients(id) on delete cascade,
  motivo_consulta text,
  antecedentes_medicos text,
  medicamentos jsonb not null default '[]'::jsonb
    check (jsonb_typeof(medicamentos) = 'array'),
  alergias jsonb not null default '[]'::jsonb
    check (jsonb_typeof(alergias) = 'array'),
  antecedentes_familiares text,
  habitos jsonb not null default '{}'::jsonb
    check (jsonb_typeof(habitos) = 'object'),
  embarazo_lactancia boolean,
  updated_by uuid references doctors(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint patient_medical_background_patient_unique unique (patient_id)
);

create index patient_medical_background_org_idx on patient_medical_background (org_id);

-- ---------------------------------------------------------------------------
-- Atenciones (encounters)
-- ---------------------------------------------------------------------------
create table encounters (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete restrict,
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_id uuid not null references doctors(id) on delete restrict,
  appointment_id uuid references appointments(id) on delete set null,
  started_at timestamptz not null default now(),
  care_type text,
  motivo text,
  evolucion text,
  diagnostico text,
  indicaciones text,
  proxima_cita_at timestamptz,
  specialty_data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(specialty_data) = 'object'),
  status text not null default 'draft'
    check (status in ('draft', 'signed')),
  signed_by uuid references doctors(id) on delete set null,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index encounters_org_patient_idx on encounters (org_id, patient_id);
create index encounters_patient_started_idx on encounters (patient_id, started_at desc);
create unique index encounters_appointment_uq on encounters (appointment_id)
  where appointment_id is not null;

-- ---------------------------------------------------------------------------
-- Versiones de atenciones firmadas (inmutables)
-- ---------------------------------------------------------------------------
create table encounter_versions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete restrict,
  patient_id uuid not null references patients(id) on delete cascade,
  encounter_id uuid not null references encounters(id) on delete cascade,
  author_id uuid not null references doctors(id) on delete restrict,
  reason text default 'Corrección de ficha firmada',
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz not null default now()
);

create index encounter_versions_encounter_idx on encounter_versions (encounter_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Archivos adjuntos (el binario vive en el bucket 'ficha-adjuntos')
-- ---------------------------------------------------------------------------
create table attachments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete restrict,
  patient_id uuid not null references patients(id) on delete cascade,
  encounter_id uuid references encounters(id) on delete set null,
  kind text not null default 'document'
    check (kind in (
      'document', 'radiografia', 'foto_intraoral', 'foto_extraoral',
      'modelo', 'consentimiento', 'informe', 'other'
    )),
  description text,
  taken_at date,
  storage_path text not null,
  file_name text,
  mime text,
  size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references doctors(id) on delete set null,
  created_at timestamptz not null default now()
);

create index attachments_org_patient_idx on attachments (org_id, patient_id);

-- ---------------------------------------------------------------------------
-- Consentimientos informados
-- ---------------------------------------------------------------------------
create table consents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete restrict,
  patient_id uuid not null references patients(id) on delete cascade,
  encounter_id uuid references encounters(id) on delete set null,
  kind text not null
    check (kind in (
      'datos_personales', 'tratamiento_dental', 'psicoterapia',
      'atencion_online', 'other'
    )),
  accepted_text text not null,
  version text not null default '1',
  accepted_at timestamptz not null default now(),
  accepted_by_patient boolean not null default true,
  signature_hash text,
  signed_by uuid references doctors(id) on delete set null
);

create index consents_org_patient_idx on consents (org_id, patient_id);

-- ---------------------------------------------------------------------------
-- Recetas (compartidas por dental y médica)
-- ---------------------------------------------------------------------------
create table prescriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete restrict,
  patient_id uuid not null references patients(id) on delete cascade,
  encounter_id uuid references encounters(id) on delete set null,
  medication text not null,
  dose text not null,
  route text,
  frequency text,
  duration text,
  created_by uuid references doctors(id) on delete set null,
  created_at timestamptz not null default now()
);

create index prescriptions_org_patient_idx on prescriptions (org_id, patient_id);

-- ---------------------------------------------------------------------------
-- Auditoría (sólo escritura por trigger; lectura admin/superadmin)
-- ---------------------------------------------------------------------------
create table audit_log (
  id bigint generated always as identity primary key,
  org_id uuid,
  actor_id uuid,
  action text not null
    check (action in ('insert', 'update', 'delete', 'sign', 'export', 'view')),
  entity text not null,
  entity_id text,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_org_idx on audit_log (org_id, created_at desc);