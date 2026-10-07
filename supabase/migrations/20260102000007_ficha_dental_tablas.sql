-- 20260102000007 · Ficha clínica odontológica: odontograma, periodontograma,
-- plan de tratamiento y catálogo de tratamientos.

-- ---------------------------------------------------------------------------
-- Catálogo de tratamientos por organización (valores y nombre)
-- ---------------------------------------------------------------------------
create table dental_treatments_catalog (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete restrict,
  name text not null,
  default_value numeric(12, 2) not null default 0,
  active boolean not null default true,
  created_by uuid references doctors(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create index dental_catalog_org_idx on dental_treatments_catalog (org_id);

-- ---------------------------------------------------------------------------
-- Odontograma: una fila por pieza × cara registrada. La fila "actual" es el
-- último estado (current = true); el resto es histórico de evolución.
-- ---------------------------------------------------------------------------
create table dental_chart_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete restrict,
  patient_id uuid not null references patients(id) on delete cascade,
  encounter_id uuid references encounters(id) on delete set null,
  tooth smallint not null,
  dentition text not null check (dentition in ('permanent', 'deciduous')),
  face text not null
    check (face in ('vestibular', 'lingual', 'mesial', 'distal', 'occlusal', 'incisal')),
  state text not null
    check (state in (
      'sana', 'caries', 'obturada', 'fractura', 'desgaste', 'sellante',
      'ausente', 'por_extraer', 'extraida', 'endodoncia', 'corona', 'puente',
      'implante', 'protesis_removible', 'incluida'
    )),
  current boolean not null default true,
  recorded_at date not null default current_date,
  created_by uuid references doctors(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint dental_chart_tooth_fdi check (
    (dentition = 'permanent' and tooth between 11 and 48)
    or (dentition = 'deciduous' and tooth between 51 and 85)
  )
);

create index dental_chart_patient_idx on dental_chart_entries (patient_id, tooth, face);
create unique index dental_chart_current_uq on dental_chart_entries (patient_id, tooth, face)
  where current = true;

-- Al registrar un nuevo estado para la misma pieza/cara, el anterior deja de
-- ser el "actual" y queda como histórico.
create or replace function dental_chart_finalize_previous()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update dental_chart_entries
  set current = false
  where patient_id = new.patient_id
    and tooth = new.tooth
    and face = new.face
    and id <> new.id
    and current = true;
  return new;
end;
$$;

create trigger dental_chart_before_insert
  before insert on dental_chart_entries
  for each row execute function dental_chart_finalize_previous();

-- ---------------------------------------------------------------------------
-- Periodontograma básico por pieza
-- ---------------------------------------------------------------------------
create table periodontal_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete restrict,
  patient_id uuid not null references patients(id) on delete cascade,
  encounter_id uuid references encounters(id) on delete set null,
  tooth smallint not null,
  depths jsonb not null default '{}'::jsonb
    check (jsonb_typeof(depths) = 'object'),
  bleeding_on_probing boolean,
  recession smallint,
  mobility smallint not null default 0 check (mobility between 0 and 3),
  furcation text,
  diagnosis text,
  recorded_at date not null default current_date,
  created_by uuid references doctors(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint periodontal_tooth_fdi check (tooth between 11 and 48 or tooth between 51 and 85)
);

create index periodontal_patient_idx on periodontal_records (org_id, patient_id, recorded_at);

-- ---------------------------------------------------------------------------
-- Plan de tratamiento y presupuesto
-- ---------------------------------------------------------------------------
create table dental_treatment_plan_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete restrict,
  patient_id uuid not null references patients(id) on delete cascade,
  encounter_id uuid references encounters(id) on delete set null,
  tooth smallint check (tooth between 11 and 48 or tooth between 51 and 85),
  faces text[],
  treatment_id uuid references dental_treatments_catalog(id) on delete set null,
  description text,
  priority smallint,
  stage text,
  value numeric(12, 2) not null default 0,
  status text not null default 'pendiente'
    check (status in ('pendiente', 'aceptado', 'en_curso', 'realizado', 'rechazado')),
  approved boolean not null default false,
  approved_at timestamptz,
  created_by uuid references doctors(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index treatment_plan_patient_idx on dental_treatment_plan_items (org_id, patient_id, status);