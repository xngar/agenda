-- =====================================================================
-- 0006 · Seed de desarrollo
--
-- Sólo datos de catálogo (servicios, feriados, reglas base). Los doctores
-- dependen de auth.users, por eso los crea scripts/seed-dev.ts con la
-- service role; ese script es idempotente y llama a esta lógica.
-- =====================================================================

-- Feriados legales de Chile para un año dado.
--
-- Decisión documentada (DECISIONS.md): aplicamos la regla de traslado
-- "si cae martes o miércoles, se mueve al lunes anterior" a las fechas
-- móviles (Día del Padre, Todos los Santos, Inmaculada Concepción). Las
-- fechas que caen domingo se registran tal cual: la clínica no atiende
-- domingos, así que no afecta la disponibilidad.
create or replace function chile_holidays(p_year int)
returns table(day date, label text)
language plpgsql
immutable
as $$
declare
  a int; b int; c int; d int; e int; f int; g int; h int;
  i int; k int; l int; m int; em int; ed int;
  v_easter date;
  v_day int;
begin
  -- Domingo Gauss / Meeus.
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

  -- Fechas fijas.
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

  -- Móviles: trasladamos al lunes anterior cuando caen martes o miércoles.
  -- Día del Padre: tercer domingo de junio (1 + offset + 14).
  v_day := make_date(p_year, 6, 1)
    + ((7 - extract(dow from make_date(p_year, 6, 1))::int) % 7)
    + 14;
  return query
    select case
      when extract(dow from v_day) in (2, 3)
        then v_day - (extract(dow from v_day)::int - 1)
      else v_day
    end, 'Día del Padre';

  -- Todos los Santos (1 de noviembre).
  return query
    select case
      when extract(dow from make_date(p_year, 11, 1)) in (2, 3)
        then make_date(p_year, 11, 1) - (extract(dow from make_date(p_year, 11, 1))::int - 1)
      else make_date(p_year, 11, 1)
    end, 'Todos los Santos';

  -- Inmaculada Concepción (8 de diciembre).
  return query
    select case
      when extract(dow from make_date(p_year, 12, 8)) in (2, 3)
        then make_date(p_year, 12, 8) - (extract(dow from make_date(p_year, 12, 8))::int - 1)
      else make_date(p_year, 12, 8)
    end, 'Inmaculada Concepción';
end;
$$;

insert into clinic_holidays (date, name)
select h.day, h.label
from chile_holidays(extract(year from now())::int) h
on conflict (date) do update set name = excluded.name;

-- Servicios de la clínica.
insert into services (name, duration_min) values
  ('Control', 30),
  ('Limpieza', 45),
  ('Urgencia', 30)
on conflict do nothing;

-- Punto único de verdad del nombre de la clínica en dev.
update clinic_settings set name = 'Clínica Dental Sonrisa' where id = 1;