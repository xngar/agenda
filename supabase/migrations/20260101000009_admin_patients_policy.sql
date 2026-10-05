-- 0009_admin_patients_policy.sql
--
-- BUG CORREGIDO: la política de `patients` sólo comprobaba que el
-- paciente estuviera ligado a una cita del propio profesional:
--
--   EXISTS (SELECT 1 FROM appointments a
--           WHERE a.patient_id = patients.id AND a.doctor_id = auth.uid())
--
-- Con la migración 0008 el administrador ya podía VER la cita ajena, pero
-- el embed `patient:patients(...)` devolvía NULL: la agenda le mostraba
-- "Paciente" sin nombre, sin teléfono y sin correo.
--
-- Es el mismo fallo de diseño que en 0008: la feature de administración se
-- escribió sin que RLS la permitiera.

drop policy if exists doctor_read_linked_patients on patients;

create policy doctor_read_linked_patients
  on patients
  for select
  using (
    is_admin()
    or exists (
      select 1
      from appointments a
      where a.patient_id = patients.id
        and a.doctor_id = auth.uid()
    )
  );