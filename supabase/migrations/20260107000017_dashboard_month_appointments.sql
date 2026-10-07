-- 0017_dashboard_month_appointments.sql
--
-- Calendario mensual del panel. `dashboard_appointments` sólo acepta un
-- día y `appointments_in_range` filtra a pending/confirmed y no trae el
-- servicio, así que la vista mes necesita su propia función de rango.
--
-- Reglas heredadas de 0010 (no romper):
--   * `during` es un tstzrange: el filtro es de solapamiento (&&), nunca
--     >= / <= (eso devuelve "malformed range literal" y la vista llega vacía).
--   * Los límites del rango se calculan con at time zone 'America/Santiago'
--     para que el día local y el cambio de hora los resuelva Postgres.
--   * `security invoker` deja que RLS siga mandando: el profesional ve lo
--     suyo, el admin a todo el equipo y la recepción, la org en lectura.

create or replace function public.dashboard_month_appointments(
  p_from date,
  p_to date,
  p_doctor uuid default null
)
returns setof jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'id', a.id,
    'doctor_id', a.doctor_id,
    'patient_id', a.patient_id,
    'service_id', a.service_id,
    'during', a.during,
    'status', a.status,
    'cancelled_by', a.cancelled_by,
    'cancel_reason', a.cancel_reason,
    'created_at', a.created_at,
    'patient', case when p.id is null then null else jsonb_build_object(
      'full_name', p.full_name, 'phone', p.phone, 'email', p.email, 'rut', p.rut
    ) end,
    'service', case when s.id is null then null else jsonb_build_object(
      'name', s.name, 'duration_min', s.duration_min
    ) end
  )
  from appointments a
  left join patients p on p.id = a.patient_id
  left join services s on s.id = a.service_id
  where a.during && tstzrange(
          p_from::timestamp at time zone 'America/Santiago',
          (p_to + 1)::timestamp at time zone 'America/Santiago',
          '[)'
        )
    and (p_doctor is null or a.doctor_id = p_doctor)
  order by a.during;
$$;

comment on function public.dashboard_month_appointments(date, date, uuid) is
  'Citas de un rango de fechas locales (calendario mensual), todos los
   estados, con paciente y servicio embebidos. Usa solapamiento (&&) porque
   una columna tstzrange NO se puede filtrar con >= / <=';

grant execute on function public.dashboard_month_appointments(date, date, uuid) to authenticated;
