-- 0013_dashboard_day_summaries.sql
--
-- Por qué: la agenda abre en el día de hoy. Si el paciente reserva para
-- mañana, el profesional entra al panel, ve un día vacío y no tiene forma
-- de saber que la cita existe: el panel sólo aceptaba `?date=` por URL y no
-- había ningún control para cambiar de día.
--
-- Esta función devuelve, para una ventana de fechas, cuántas citas hay cada
-- día. Con eso el panel puede mostrar "tienes 1 cita el martes" en vez de un
-- vacío sin explicación.
--
-- Mismo criterio que `dashboard_appointments` (0010):
--   - `security invoker`, así que RLS sigue mandando (un profesional ve sólo
--     los días que tienen citas suyas; un admin, los de todo el equipo);
--   - el día se calcula con `at time zone 'America/Santiago'`, no en UTC.
--
-- Se cuenta sobre el solapamiento (&&) por la misma razón que en 0010: una
-- columna tstzrange no se puede filtrar con >= / <=.

create or replace function public.dashboard_day_summaries(
  p_from date,
  p_to date,
  p_doctor uuid default null
)
returns table (day date, total bigint, pendientes bigint)
language sql
stable
security invoker
set search_path = public
as $$
  -- Se generan los días y se cruzan con las citas por solapamiento. El
  -- `having` deja fuera los días sin citas: el panel sólo necesita saber
  -- qué días tienen algo.
  with dias as (
    select generate_series(p_from::timestamp, p_to::timestamp, interval '1 day')::date as dia
  )
  select
    dias.dia as day,
    count(a.id) as total,
    count(a.id) filter (where a.status = 'pending') as pendientes
  from dias
  left join appointments a
    on a.during && tstzrange(
         dias.dia::timestamp at time zone 'America/Santiago',
         (dias.dia + 1)::timestamp at time zone 'America/Santiago',
         '[)'
       )
   and (p_doctor is null or a.doctor_id = p_doctor)
  group by dias.dia
  having count(a.id) > 0
  order by dias.dia;
$$;

comment on function public.dashboard_day_summaries(date, date, uuid) is
  'Citas por día local en America/Santiago dentro de una ventana. Alimenta la
   navegación de fechas del panel para que un día vacío se explique en vez de
   parecer un fallo.';