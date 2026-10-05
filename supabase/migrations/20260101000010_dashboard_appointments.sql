-- 0010_dashboard_appointments.sql
--
-- BUG CORREGIDO: el panel filtraba la agenda con
--
--   .gte("during", desde).lte("during", hasta)
--
-- pero `during` es una columna `tstzrange`. PostgREST traducía eso a
-- `during >= '2026-10-08T03:00:00.000Z'`, y Postgres, al no existir un
-- operador `>=` entre tstzrange y timestamptz, intentaba castear el
-- instante a rango y respondía:
--
--   malformed range literal: "2026-10-08T03:00:00.000Z"
--
-- La agenda llegaba VACÍA y la página lo mostraba como error. El filtro
-- correcto es el de solapamiento (&&).
--
-- Se resuelve con una función SQL y no con sintaxis de PostgREST por dos
-- razones: (1) el límite del día se calcula con `at time zone
-- 'America/Santiago'`, así que el cambio de hora de verano lo resuelve
-- Postgres y no el código; (2) `security invoker` deja que RLS siga
-- mandando, y las migraciones 0008 y 0009 ya permiten que un admin vea
-- las citas y pacientes de todo el equipo.

create or replace function public.dashboard_appointments(p_day date, p_doctor uuid default null)
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
          p_day::timestamp at time zone 'America/Santiago',
          (p_day + 1)::timestamp at time zone 'America/Santiago',
          '[)'
        )
    and (p_doctor is null or a.doctor_id = p_doctor)
  order by a.during;
$$;

comment on function public.dashboard_appointments(date, uuid) is
  'Citas de un día local en America/Santiago. Usa el operador de solapamiento
   (&&) porque una columna tstzrange NO se puede filtrar con >= / <=.';