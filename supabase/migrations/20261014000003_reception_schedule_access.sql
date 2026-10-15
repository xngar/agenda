-- La recepción administra horarios y bloqueos de los profesionales (paridad
-- con el admin en Disponibilidad). Espejo de 20260107000020, que abrió
-- patients/appointments al mismo rol: sin esta extensión, los GET/POST/DELETE
-- de availability y time_off fallan por RLS aunque la API lo autorice.

drop policy if exists doctor_read_own_rules on availability_rules;
create policy doctor_read_own_rules on availability_rules
  for select to authenticated
  using (
    doctor_id = auth.uid()
    or (is_admin() and org_id = auth_org_id())
    or (staff_role() = 'reception' and org_id = auth_org_id())
  );

drop policy if exists doctor_manage_own_rules on availability_rules;
create policy doctor_manage_own_rules on availability_rules
  for all to authenticated
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

drop policy if exists doctor_read_own_time_off on time_off;
create policy doctor_read_own_time_off on time_off
  for select to authenticated
  using (
    doctor_id = auth.uid()
    or (is_admin() and org_id = auth_org_id())
    or (staff_role() = 'reception' and org_id = auth_org_id())
  );

drop policy if exists doctor_manage_own_time_off on time_off;
create policy doctor_manage_own_time_off on time_off
  for all to authenticated
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
