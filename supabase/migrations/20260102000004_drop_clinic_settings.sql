-- Retira la configuración global antigua.
--
-- Con el modelo multi-tenant la configuración vive en `organizations`
-- (una fila por clínica) y ya ninguna función RPC ni la aplicación leen
-- `clinic_settings`. La tabla queda sin uso, así que se elimina junto con
-- sus políticas y permisos (que caen con ella).
drop table if exists clinic_settings;