-- La disponibilidad respeta a los profesionales desactivados.
--
-- `get_available_slots` no miraba `doctors.active`. El resto del sistema sí:
--   * `get_available_slots_any` filtra `where d.active` (no ofrece al
--     desactivado en "cualquiera disponible"),
--   * `book_appointment` exige `s.active and d.active` y falla con
--     A0002 slot_no_disponible.
--
-- El resultado era una contradicción: el profesional desactivado desaparece
-- del asistente público, pero si el paciente tenía la página abierta, un
-- enlace guardado o pedía sus horas con el doctorId en la URL, el listado
-- le mostraba horas y al confirmar la reserva el servidor se las negaba.
-- La UI promete una hora que después no existe.
--
-- Se corrige en la función, que es el único punto por donde pasan todas
-- las rutas, en vez de taparlo en la ruta de Next: así ninguna otra
-- llamada futura puede reintroducir la contradicción.
create or replace function get_available_slots(p_doctor uuid, p_date date, p_duration int)
returns table(slot_start timestamptz, slot_end timestamptz)
language sql stable as $$
  with cfg as (select * from clinic_settings where id = 1),
  activo as (
    -- Sin esta fila no se generan horas: es la forma más barata de cortar
    -- el caso "profesional desactivado" sin repetir la condición en cada
    -- consulta.
    select d.id from doctors d where d.id = p_doctor and d.active
  ),
  cand as (
    select gs as s, gs + make_interval(mins => p_duration) as e
    from cfg, availability_rules r,
    generate_series(
      ((p_date + r.start_time) at time zone cfg.timezone),
      ((p_date + r.end_time) at time zone cfg.timezone) - make_interval(mins => p_duration),
      make_interval(mins => cfg.slot_step_min)
    ) gs
    where r.doctor_id = p_doctor
      and r.weekday = extract(dow from p_date)
      and not exists (select 1 from clinic_holidays h where h.date = p_date)
      and p_date <= (now() at time zone cfg.timezone)::date + cfg.max_days_ahead
  )
  select s, e from cand, cfg
  where exists (select 1 from activo)
    and s > now() + make_interval(hours => cfg.min_notice_hours)
    and not exists (
      select 1 from appointments a
      where a.doctor_id = p_doctor and a.status in ('pending','confirmed')
        and a.during && tstzrange(s, e))
    and not exists (
      select 1 from time_off t
      where t.doctor_id = p_doctor and t.during && tstzrange(s, e))
  order by s;
$$;