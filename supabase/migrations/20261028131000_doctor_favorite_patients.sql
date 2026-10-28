-- 20261028131000_doctor_favorite_patients.sql
-- Pacientes favoritos por profesional (médico / odontólogo / psicólogo)

create table if not exists public.doctor_favorite_patients (
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (doctor_id, patient_id)
);

create index if not exists idx_doctor_favorite_patients_doctor
  on public.doctor_favorite_patients (doctor_id, created_at desc);

create index if not exists idx_doctor_favorite_patients_patient
  on public.doctor_favorite_patients (patient_id);

alter table public.doctor_favorite_patients enable row level security;

create policy doctor_favorite_patients_select on public.doctor_favorite_patients
  for select to authenticated
  using (doctor_id = auth.uid());

create policy doctor_favorite_patients_insert on public.doctor_favorite_patients
  for insert to authenticated
  with check (
    doctor_id = auth.uid()
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.org_id = auth_org_id()
    )
  );

create policy doctor_favorite_patients_delete on public.doctor_favorite_patients
  for delete to authenticated
  using (doctor_id = auth.uid());

grant select, insert, delete on public.doctor_favorite_patients to authenticated;

