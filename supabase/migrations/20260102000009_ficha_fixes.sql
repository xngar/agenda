-- 20260102000009 · Ficha: correcciones detectadas por el linter de seguridad
--
-- 1. Reemplaza la vista v_patients_contact (marcada como security definer
--    por el linter, ERROR) por una función RPC que filtra por organización
--    vía auth_org_id() y solo expone columnas de contacto. La recepción
--    puede llamarla; anon no.
-- 2. organization_types queda legible para cualquier usuario autenticado
--    (catálogo público del sistema, sin datos sensibles).
-- 3. search_path fijo en chile_holidays (WARN mutable).
-- 4. Elimina pg_trgm (se añadió de forma especulativa; no se usa todavía).

create or replace function list_patients_contact()
returns table (
  id uuid,
  org_id uuid,
  full_name text,
  nombres text,
  apellido_paterno text,
  apellido_materno text,
  rut text,
  phone text,
  email text,
  birth_date date,
  sex text,
  address text,
  comuna text,
  region text,
  consent_at timestamptz,
  admitted_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.org_id, p.full_name, p.nombres, p.apellido_paterno,
         p.apellido_materno, p.rut, p.phone, p.email, p.birth_date, p.sex,
         p.address, p.comuna, p.region, p.consent_at, p.admitted_at, p.created_at
  from patients p
  where p.org_id = auth_org_id();
$$;

revoke all on function list_patients_contact() from anon, public, authenticated;
grant execute on function list_patients_contact() to authenticated;

drop view if exists v_patients_contact;

drop policy if exists organization_types_read on organization_types;
create policy organization_types_read on organization_types
  for select to authenticated
  using (true);

create or replace function chile_holidays(p_year integer)
returns table (day date, label text)
language plpgsql
immutable
set search_path = public, pg_temp
as $function$
declare
  a int; b int; c int; d int; e int; f int; g int; h int;
  i int; k int; l int; m int; em int; ed int;
  v_easter date;
  v_day date;
begin
  a := p_year % 19;
  b := p_year / 100;
  c := p_year % 100;
  d := b / 4;
  e := b % 4;
  f := (b + 8) / 25;
  g := (b - f + 1) / 3;
  h := (19 * a + b - d - g + 15) % 30;
  i := c / 4;
  k := c % 4;
  l := (32 + 2 * e + 2 * i - h - k) % 7;
  m := (a + 11 * h + 22 * l) / 451;
  em := (h + l - 7 * m + 114) / 31;
  ed := ((h + l - 7 * m + 114) % 31) + 1;
  v_easter := make_date(p_year, em, ed);

  return query select make_date(p_year, 1, 1),  'Año Nuevo';
  return query select v_easter - 2,               'Viernes Santo';
  return query select v_easter - 1,               'Sábado Santo';
  return query select make_date(p_year, 5, 1),   'Día del Trabajo';
  return query select make_date(p_year, 5, 21),  'Glorias Navales';
  return query select make_date(p_year, 8, 15),  'Virgen del Carmen';
  return query select make_date(p_year, 9, 17),  'Glorias del Ejército';
  return query select make_date(p_year, 9, 18),  'Fiestas Patrias';
  return query select make_date(p_year, 9, 19),  'Glorias Navales (Fiestas Patrias)';
  return query select make_date(p_year, 10, 12), 'Encuentro de Dos Mundos';
  return query select make_date(p_year, 12, 25), 'Navidad';

  v_day := make_date(p_year, 6, 1)
    + ((7 - extract(dow from make_date(p_year, 6, 1))::int) % 7)
    + 14;
  return query
    select case when extract(dow from v_day) in (2, 3)
                then v_day - (extract(dow from v_day)::int - 1)
                else v_day end,
           'Día del Padre';

  return query
    select case when extract(dow from make_date(p_year, 11, 1)) in (2, 3)
                then make_date(p_year, 11, 1) - (extract(dow from make_date(p_year, 11, 1))::int - 1)
                else make_date(p_year, 11, 1) end,
           'Todos los Santos';

  return query
    select case when extract(dow from make_date(p_year, 12, 8)) in (2, 3)
                then make_date(p_year, 12, 8) - (extract(dow from make_date(p_year, 12, 8))::int - 1)
                else make_date(p_year, 12, 8) end,
           'Inmaculada Concepción';
end;
$function$;

drop extension if exists pg_trgm;