-- =====================================================================
-- 0004 · Row Level Security
--
-- Principio: el paciente anónimo nunca lee appointments ni patients.
-- Solo usa RPC deBooking/cancel/reschedule a través del servidor.
-- El doctor autenticado ve únicamente lo propio; is_admin administra el
-- catálogo (doctores, servicios, feriados, configuración).
-- =====================================================================

alter table clinic_settings  enable row level security;
alter table clinic_holidays  enable row level security;
alter table doctors          enable row level security;
alter table services         enable row level security;
alter table availability_rules enable row level security;
alter table time_off         enable row level security;
alter table patients         enable row level security;
alter table appointments     enable row level security;
alter table notifications    enable row level security;

-- ---------------------------------------------------------------------
-- Anónimo: catálogo público mínimo.
-- En doctors sólo se expone nombre y especialidad (columnas, no filas).
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on clinic_settings to anon;
grant select on clinic_holidays to anon;
grant select (id, full_name, specialty) on doctors to anon;
grant select (id, name, duration_min) on services to anon;

create policy anon_read_clinic_settings on clinic_settings
  for select to anon, authenticated using (true);

create policy anon_read_clinic_holidays on clinic_holidays
  for select to anon, authenticated using (true);

create policy anon_read_active_doctors on doctors
  for select to anon, authenticated using (active);

create policy anon_read_active_services on services
  for select to anon, authenticated using (active);

-- ---------------------------------------------------------------------
-- Doctores autenticados
-- ---------------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select d.is_admin from doctors d where d.id = auth.uid()), false);
$$;

create policy doctor_read_own_profile on doctors
  for select to authenticated using (id = auth.uid() or active);

create policy doctor_update_own_profile on doctors
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy doctor_read_catalog on services
  for select to authenticated using (true);

-- Patients: el doctor sólo ve los pacientes con los que tiene cita.
create policy doctor_read_linked_patients on patients
  for select to authenticated
  using (exists (
    select 1 from appointments a
    where a.patient_id = patients.id and a.doctor_id = auth.uid()
  ));

-- Appointments: sólo las propias.
create policy doctor_read_own_appointments on appointments
  for select to authenticated using (doctor_id = auth.uid());

create policy doctor_update_own_appointments on appointments
  for update to authenticated
  using (doctor_id = auth.uid())
  with check (doctor_id = auth.uid());

-- Notifications: propias.
create policy doctor_read_own_notifications on notifications
  for select to authenticated using (doctor_id = auth.uid());

create policy doctor_update_own_notifications on notifications
  for update to authenticated
  using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());

-- Disponibilidad y bloqueos: propios; admin puede ver todo.
create policy doctor_read_own_rules on availability_rules
  for select to authenticated using (doctor_id = auth.uid() or is_admin());

create policy doctor_manage_own_rules on availability_rules
  for all to authenticated
  using (doctor_id = auth.uid() or is_admin())
  with check (doctor_id = auth.uid() or is_admin());

create policy doctor_read_own_time_off on time_off
  for select to authenticated using (doctor_id = auth.uid() or is_admin());

create policy doctor_manage_own_time_off on time_off
  for all to authenticated
  using (doctor_id = auth.uid() or is_admin())
  with check (doctor_id = auth.uid() or is_admin());

-- ---------------------------------------------------------------------
-- Admin: catálogo de la clínica
-- ---------------------------------------------------------------------
create policy admin_manage_doctors on doctors
  for all to authenticated
  using (is_admin()) with check (is_admin() or id = auth.uid());

create policy admin_manage_services on services
  for all to authenticated
  using (is_admin()) with check (is_admin());

create policy admin_manage_holidays on clinic_holidays
  for all to authenticated
  using (is_admin()) with check (is_admin());

create policy admin_manage_settings on clinic_settings
  for all to authenticated
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- Permisos de RPC: el anónimo sólo puede reservar/consultar;
-- nunca leer tablas de citas. doctor_update_appointment exige sesión.
-- ---------------------------------------------------------------------
revoke all on function get_available_slots(uuid, date, int) from public;
grant execute on function get_available_slots(uuid, date, int) to anon, authenticated;

revoke all on function get_available_slots_any(date, int) from public;
grant execute on function get_available_slots_any(date, int) to anon, authenticated;

revoke all on function book_appointment(uuid, uuid, timestamptz, text, text, text, text, text) from public;
grant execute on function book_appointment(uuid, uuid, timestamptz, text, text, text, text, text) to anon, authenticated;

revoke all on function reschedule_appointment(text, timestamptz, uuid) from public;
grant execute on function reschedule_appointment(text, timestamptz, uuid) to anon, authenticated;

revoke all on function cancel_appointment(text, text) from public;
grant execute on function cancel_appointment(text, text) to anon, authenticated;

revoke all on function doctor_update_appointment(uuid, text, text, timestamptz, uuid) from public;
grant execute on function doctor_update_appointment(uuid, text, text, timestamptz, uuid) to authenticated;

revoke all on function claim_due_reminders() from public;
grant execute on function claim_due_reminders() to authenticated, service_role;

revoke all on function is_admin() from public;
grant execute on function is_admin() to authenticated, service_role;