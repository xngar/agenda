-- Actualiza servicios por defecto y normaliza servicios existentes
-- Nuevos servicios: Primera consulta (45), Control / seguimiento (30), Urgencia (30), Otra consulta (30)
-- Limpieza deja de existir

-- 1) Renombrar servicios existentes
update services set name = 'Control / seguimiento' where lower(name) = 'control';
update services set name = 'Otra consulta', active = true, duration_min = 30 where lower(name) = 'limpieza';
update services set duration_min = 30 where lower(name) = 'urgencia' and duration_min <> 30;

-- 2) Asegurar existencia de los 4 servicios por organizacion (idempotente)
insert into services (id, org_id, name, duration_min, active)
select gen_random_uuid(), o.id, 'Primera consulta', 45, true
from organizations o
where not exists (
  select 1 from services s
  where s.org_id = o.id and lower(s.name) = 'primera consulta'
);

insert into services (id, org_id, name, duration_min, active)
select gen_random_uuid(), o.id, 'Control / seguimiento', 30, true
from organizations o
where not exists (
  select 1 from services s
  where s.org_id = o.id and lower(s.name) = 'control / seguimiento'
);

insert into services (id, org_id, name, duration_min, active)
select gen_random_uuid(), o.id, 'Urgencia', 30, true
from organizations o
where not exists (
  select 1 from services s
  where s.org_id = o.id and lower(s.name) = 'urgencia'
);

insert into services (id, org_id, name, duration_min, active)
select gen_random_uuid(), o.id, 'Otra consulta', 30, true
from organizations o
where not exists (
  select 1 from services s
  where s.org_id = o.id and lower(s.name) = 'otra consulta'
);

-- 3) Desactivar cualquier servicio restante llamado 'Limpieza'
update services set active = false where lower(name) = 'limpieza';
