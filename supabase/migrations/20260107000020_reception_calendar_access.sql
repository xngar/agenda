-- 20260107000020 · la recepción ve pacientes y gestiona citas del equipo
--
-- La recepción necesita ver y gestionar la agenda de los profesionales cuando
-- ellos no están. Sin esto, el nombre del paciente aparecía como "Paciente" en
-- la agenda (las RPC son security invoker y el LEFT JOIN a patients le quedaba
-- vacío por RLS) y no podía cambiar estados de ninguna cita.
--
-- El detalle clínico NO depende de esta política: el endpoint de ficha exige el
-- rol clínico por código (403) y las tablas clínicas (antecedentes, atenciones,
-- odontograma...) conservan sus propias políticas is_clinical().

-- patients: lectura básica (nombre, contacto, RUT) para la recepción.
drop policy if exists patients_clinical_read on patients;
create policy patients_clinical_read on patients
  for select to authenticated
  using (
    org_id = auth_org_id()
    and (is_clinical() or staff_role() = 'reception')
  );

-- appointments: la recepción confirma/cancela/completa citas de su
-- organización (mismo alcance que su SELECT, vigente desde la migración 0008).
drop policy if exists doctor_update_own_appointments on appointments;
create policy doctor_update_own_appointments on appointments
  for update to authenticated
  using (
    doctor_id = auth.uid()
    or (is_admin() and org_id = auth_org_id())
    or (staff_role() = 'reception' and org_id = auth_org_id())
  )
  with check (
    doctor_id = auth.uid()
    or (is_admin() and org_id = auth_org_id())
    or (staff_role() = 'reception' and org_id = auth_org_id())
  );
