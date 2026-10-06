-- 20260102000003 · RLS por organizacion (Fase 4)
--
-- Rehace las politicas de la fase mono-clinica (0004/0008/0009) para que
-- un admin solo vea y gestione SU organizacion. Antes un `is_admin()`
-- daba acceso a servicios, feriados, doctores, citas y pacientes de
-- todas las clinicas.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
alter table organizations enable row level security;

create or replace function auth_org_id()
returns uuid
language sql stable
security definer
set search_path = public, pg_temp
as $$
  select org_id from doctors where id = auth.uid() and active;
$$;

create or replace function is_admin()
returns boolean
language sql stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select d.is_admin from doctors d where d.id = auth.uid() and d.active), false);
$$;

create or replace function is_super_admin()
returns boolean
language sql stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select d.is_super_admin from doctors d where d.id = auth.uid() and d.active), false);
$$;

grant execute on function auth_org_id() to authenticated, service_role;
grant execute on function is_admin() to authenticated, service_role;
grant execute on function is_super_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- organizations: el super-admin gestiona todo; cada miembro lee la suya.
-- ---------------------------------------------------------------------------
grant select on organizations to authenticated;

drop policy if exists org_read_own on organizations;
create policy org_read_own on organizations
  for select to authenticated
  using (id = auth_org_id() or is_super_admin());

drop policy if exists super_admin_manage_orgs on organizations;
create policy super_admin_manage_orgs on organizations
  for all to authenticated
  using (is_super_admin())
  with check (is_super_admin());

-- ---------------------------------------------------------------------------
-- appointments: el profe ve las suyas; un admin, las de SU organizacion.
-- ---------------------------------------------------------------------------
drop policy if exists doctor_read_own_appointments on appointments;
create policy doctor_read_own_appointments on appointments
  for select to authenticated
  using (doctor_id = auth.uid() or (is_admin() and org_id = auth_org_id()));

drop policy if exists doctor_update_own_appointments on appointments;
create policy doctor_update_own_appointments on appointments
  for update to authenticated
  using (doctor_id = auth.uid() or (is_admin() and org_id = auth_org_id()))
  with check (doctor_id = auth.uid() or (is_admin() and org_id = auth_org_id()));

-- ---------------------------------------------------------------------------
-- availability_rules / time_off
-- ---------------------------------------------------------------------------
drop policy if exists doctor_read_own_rules on availability_rules;
create policy doctor_read_own_rules on availability_rules
  for select to authenticated
  using (doctor_id = auth.uid() or (is_admin() and org_id = auth_org_id()));

drop policy if exists doctor_manage_own_rules on availability_rules;
create policy doctor_manage_own_rules on availability_rules
  for all to authenticated
  using (doctor_id = auth.uid() or (is_admin() and org_id = auth_org_id()))
  with check (doctor_id = auth.uid() or (is_admin() and org_id = auth_org_id()));

drop policy if exists doctor_read_own_time_off on time_off;
create policy doctor_read_own_time_off on time_off
  for select to authenticated
  using (doctor_id = auth.uid() or (is_admin() and org_id = auth_org_id()));

drop policy if exists doctor_manage_own_time_off on time_off;
create policy doctor_manage_own_time_off on time_off
  for all to authenticated
  using (doctor_id = auth.uid() or (is_admin() and org_id = auth_org_id()))
  with check (doctor_id = auth.uid() or (is_admin() and org_id = auth_org_id()));

-- ---------------------------------------------------------------------------
-- doctors: cada profe se lee; admin ve y gestiona los de SU organizacion.
-- ---------------------------------------------------------------------------
drop policy if exists doctor_read_own_profile on doctors;
create policy doctor_read_own_profile on doctors
  for select to authenticated
  using (id = auth.uid() or (active and org_id = auth_org_id()));

drop policy if exists doctor_update_own_profile on doctors;
create policy doctor_update_own_profile on doctors
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists admin_manage_doctors on doctors;
create policy admin_manage_doctors on doctors
  for all to authenticated
  using (is_admin() and org_id = auth_org_id())
  with check ((is_admin() and org_id = auth_org_id()) or id = auth.uid());

-- ---------------------------------------------------------------------------
-- services: el catalogo autenticado se limita a la organizacion.
-- ---------------------------------------------------------------------------
drop policy if exists doctor_read_catalog on services;
create policy doctor_read_catalog on services
  for select to authenticated
  using (org_id = auth_org_id());

drop policy if exists admin_manage_services on services;
create policy admin_manage_services on services
  for all to authenticated
  using (is_admin() and org_id = auth_org_id())
  with check (is_admin() and org_id = auth_org_id());

-- ---------------------------------------------------------------------------
-- clinic_holidays: el admin gestiona los de SU organizacion.
-- (La lectura anonima sigue abierta: son fechas, no datos personales.)
-- ---------------------------------------------------------------------------
drop policy if exists admin_manage_holidays on clinic_holidays;
create policy admin_manage_holidays on clinic_holidays
  for all to authenticated
  using (is_admin() and org_id = auth_org_id())
  with check (is_admin() and org_id = auth_org_id());

-- ---------------------------------------------------------------------------
-- patients: el profe ve los pacientes de sus citas; un admin, los de las
-- citas de SU organizacion.
-- ---------------------------------------------------------------------------
drop policy if exists doctor_read_linked_patients on patients;
create policy doctor_read_linked_patients on patients
  for select to authenticated
  using (
    exists (
      select 1 from appointments a
      where a.patient_id = patients.id
        and (a.doctor_id = auth.uid() or (is_admin() and a.org_id = auth_org_id()))
    )
  );