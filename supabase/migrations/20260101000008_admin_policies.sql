-- 0008_admin_policies.sql
--
-- BUG CORREGIDO: las políticas de `appointments` sólo permitían
--   doctor_id = auth.uid()
-- sin ninguna excepción para administración. Eso hacía imposible el
-- panel de admin: un administrador no podía LEER ni cambiar de estado las
-- citas de otros profesionales, y el filtro "ver todo el equipo"
-- devolvía una agenda vacía.
--
-- Se usa la función `is_admin()` que ya existía, en lugar de duplicar la
-- consulta a `doctors` en cada política.

drop policy if exists doctor_read_own_appointments on appointments;

create policy doctor_read_own_appointments
  on appointments
  for select
  using (doctor_id = auth.uid() or is_admin());

drop policy if exists doctor_update_own_appointments on appointments;

create policy doctor_update_own_appointments
  on appointments
  for update
  using (doctor_id = auth.uid() or is_admin())
  with check (doctor_id = auth.uid() or is_admin());