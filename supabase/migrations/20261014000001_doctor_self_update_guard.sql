-- 20261014000001 · Mi perfil: impedir auto-escalada en doctors
--
-- Contexto: `doctor_update_own_profile` permite a cualquier usuario
-- autenticado actualizar su propia fila (`id = auth.uid()`), pero su
-- `WITH CHECK` no restringe columnas. Sin este guardián, un update
-- directo vía PostgREST podría auto-otorgarse `is_admin`, cambiar
-- `role`, reactivarse (`active`) o moverse de organización (`org_id`).
--
-- El endpoint `/api/dashboard/profile` ya usa whitelist + service_role,
-- así que nunca toca esas columnas. Este trigger cierra el hueco a nivel
-- de base para cualquier otro camino (PostgREST directo, SQL, etc.).
--
-- Notas:
-- - `service_role` no tiene `auth.uid()` (null): la primera rama nunca
--   dispara para él y la segunda solo dispara si cambiara `org_id`,
--   cosa que el endpoint no hace. No rompe los flujos con service_role.
-- - Los administradores gestionando a OTROS miembros no pasan por la
--   primera rama (solo fila propia) y siguen cubiertos por
--   `admin_manage_doctors`. Solo se les bloquea mover gente entre
--   organizaciones, que nadie necesita hacer.

create or replace function prevent_doctor_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- 1) Edición propia sin ser admin: solo nombre y especialidad.
  if old.id = auth.uid() and not is_admin() and not is_super_admin() then
    if new.is_admin is distinct from old.is_admin
      or new.is_super_admin is distinct from old.is_super_admin
      or new.role is distinct from old.role
      or new.org_id is distinct from old.org_id
      or new.active is distinct from old.active then
      raise exception 'no_puedes_cambiar_rol_permiso_organizacion_estado' using errcode = '42501';
    end if;
  end if;

  -- 2) Nadie fuera del equipo de plataforma mueve doctores entre orgs.
  if new.org_id is distinct from old.org_id and not is_super_admin() then
    raise exception 'no_puedes_cambiar_organizacion' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists doctor_self_escalation_guard on doctors;
create trigger doctor_self_escalation_guard
  before update on doctors
  for each row execute function prevent_doctor_self_escalation();
