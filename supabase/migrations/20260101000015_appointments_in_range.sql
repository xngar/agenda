-- 0015_appointments_in_range.sql
--
-- Utilidad compartida por las pantallas de Horario y Bloqueos.
--
-- Ambas necesitan responder lo mismo antes de aplicar un cambio:
-- "¿qué citas ya agendadas quedan tocadas?". No es cosmético: cambiar el
-- horario o bloquear un rango NO mueve ni cancela citas (sólo afecta a
-- reservas nuevas), así que quien hace el cambio tiene que ver el daño antes
-- de confirmarlo.
--
-- No se puede pedir con PostgREST: filtrar un `tstzrange` con `during &&
-- tstzrange(...)` no tiene equivalente en el query string. Igual que en la
-- migración 0010, esto va a SQL.
--
-- `security invoker`: RLS aplica, así que un profesional sólo ve sus citas
-- y un admin, las de todo el equipo (políticas 0008 y 0009).

create or replace function public.appointments_in_range(
  p_from timestamptz,
  p_to timestamptz,
  p_doctor uuid default null
)
returns table (
  id uuid,
  during tstzrange,
  status text,
  doctor_id uuid,
  patient_name text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    a.id,
    a.during,
    a.status,
    a.doctor_id,
    p.full_name
  from appointments a
  left join patients p on p.id = a.patient_id
  where a.during && tstzrange(p_from, p_to, '[)')
    and a.status in ('pending', 'confirmed')
    and (p_doctor is null or a.doctor_id = p_doctor)
  order by a.during;
$$;

revoke execute on function public.appointments_in_range(timestamptz, timestamptz, uuid)
  from public, anon;

grant execute on function public.appointments_in_range(timestamptz, timestamptz, uuid)
  to authenticated;

comment on function public.appointments_in_range(timestamptz, timestamptz, uuid) is
  'Citas pendientes o confirmadas que solapan un rango. Usada para avisar
   qué citas quedan afectadas antes de cambiar el horario o bloquear un
   rango, porque esos cambios no reagendan lo ya reservado.';