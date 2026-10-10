-- Límite de profesionales por organización (cupo del plan).
-- null = sin límite; el mínimo viable es 2 (la clínica arranca con 1 admin).

alter table public.organizations
  add column professional_limit integer default 2;

alter table public.organizations
  add constraint organizations_professional_limit_gte2
  check (professional_limit is null or professional_limit >= 2);

-- Abuelar las organizaciones existentes: cada una parte con el máximo entre
-- 2 y su nómina actual de profesionales (se cuenta el total, activos o no,
-- para no dejar por debajo a clínicas ya pobladas; el super admin lo ajusta
-- desde el panel).
update public.organizations o
set professional_limit = greatest(2, (
  select count(*)
  from public.doctors d
  where d.org_id = o.id and d.role = 'professional' 
));
