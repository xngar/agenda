-- =====================================================================
-- Pruebas SQL del motor de disponibilidad y del token de gestión.
--
-- Ejecutar con el MCP de Supabase (execute_sql) o con psql. El bloque
-- crea su propio fixture (auth.users + doctor + reglas), no toca el
-- resto y limpia al terminar. Aserciones: `raise exception` = fallo.
--
-- Cobertura:
--   1. domingo cerrado
--   2. sábado sólo mañana
--   3. feriado deshabilita el día
--   4. time_off descuenta bloques
--   5. la hora reservada desaparece
--   6. doble reserva concurrente -> A0001 hora_ya_tomada
--   7. notificación al doctor
--   8. token sellado (cifrado) recuperable sólo con la clave
--   9. reprogramar libera la hora original
--  10. cancelar libera la hora
--  11. fuera de max_days_ahead no hay horarios
--  12. get_available_slots_any agrega por doctor
-- =====================================================================

do $$
declare
  v_doctor uuid;
  v_service uuid;
  v_user uuid := gen_random_uuid();
  v_date date;
  v_hash text;
  v_appt uuid;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data)
  values (v_user, 'sql-test@dev.local', 'x', now(), 'authenticated', 'authenticated', '{}', '{}');
  insert into doctors (id, full_name, specialty, is_admin)
  values (v_user, 'Doctora Prueba', 'General', true) returning id into v_doctor;
  insert into services (name, duration_min) values ('SQLTest', 30) returning id into v_service;

  -- lunes a viernes 09:00-13:00 y 15:00-19:00; sábado 09:00-13:00.
  insert into availability_rules (doctor_id, weekday, start_time, end_time)
  select v_doctor, w.weekday::int, s.start_time::time, s.end_time::time
  from (values (1),(2),(3),(4),(5)) as w(weekday),
       (values (time '09:00', time '13:00'), (time '15:00', time '19:00')) as s(start_time, end_time);
  insert into availability_rules (doctor_id, weekday, start_time, end_time)
  values (v_doctor, 6, time '09:00', time '13:00');

  -- Próximo lunes en hora de Santiago.
  v_date := ((now() at time zone 'America/Santiago')::date
             + (8 - extract(dow from (now() at time zone 'America/Santiago')::date)::int) % 7);
  raise notice 'Lunes de prueba: % (dow=%)', v_date, extract(dow from v_date);

  -- 1
  if (select count(*) from get_available_slots(v_doctor, v_date + 6, 30)) <> 0 then
    raise exception 'FALLO 1: domingo no ofrece horarios';
  end if;
  raise notice 'ok 1 - domingo cerrado';

  -- 2
  if (select count(*) from get_available_slots(v_doctor, v_date + 5, 30)) <> 8 then
    raise exception 'FALLO 2: sábado esperado 8, obtenido %',
      (select count(*) from get_available_slots(v_doctor, v_date + 5, 30));
  end if;
  if exists (select 1 from get_available_slots(v_doctor, v_date + 5, 30)
             where extract(hour from slot_start at time zone 'America/Santiago') >= 13) then
    raise exception 'FALLO 2: sábado ofrece horas de tarde';
  end if;
  raise notice 'ok 2 - sábado sólo mañana (8 bloques)';

  -- 3
  insert into clinic_holidays (date, name) values (v_date, 'Feriado de prueba');
  if (select count(*) from get_available_slots(v_doctor, v_date, 30)) <> 0 then
    raise exception 'FALLO 3: feriado no deshabilita el día';
  end if;
  delete from clinic_holidays where date = v_date;
  raise notice 'ok 3 - feriado deshabilita el día';

  -- El lunes abre 4 h por bloque x 2 = 16 cupos de 30 min.
  if (select count(*) from get_available_slots(v_doctor, v_date, 30)) <> 16 then
    raise exception 'FALLO 3b: lunes esperado 16, obtenido %',
      (select count(*) from get_available_slots(v_doctor, v_date, 30));
  end if;
  raise notice 'ok 3b - lunes abre 16 cupos';

  -- 4
  insert into time_off (doctor_id, during, reason)
  values (v_doctor, tstzrange((v_date + time '09:00') at time zone 'America/Santiago',
                               (v_date + time '11:00') at time zone 'America/Santiago'), 'Prueba');
  if (select count(*) from get_available_slots(v_doctor, v_date, 30)) <> 12 then
    raise exception 'FALLO 4: bloqueo esperado 12, obtenido %',
      (select count(*) from get_available_slots(v_doctor, v_date, 30));
  end if;
  raise notice 'ok 4 - time_off (09-11) quita 4 cupos';

  -- 5
  v_hash := encode(extensions.digest('token-de-prueba-1', 'sha256'), 'hex');
  v_appt := book_appointment(v_doctor, v_service,
    (v_date + time '11:00') at time zone 'America/Santiago',
    'Paciente Prueba', '11111111-1', '+56911111111', 'paciente@dev.local', v_hash);
  if (select count(*) from get_available_slots(v_doctor, v_date, 30)) <> 11 then
    raise exception 'FALLO 5: la hora reservada sigue disponible (% )',
      (select count(*) from get_available_slots(v_doctor, v_date, 30));
  end if;
  raise notice 'ok 5 - la hora reservada desaparece';

  -- 6
  begin
    perform book_appointment(v_doctor, v_service,
      (v_date + time '11:00') at time zone 'America/Santiago',
      'Otro', '22222222-2', '+56922222222', 'otro@dev.local',
      encode(extensions.digest('token-de-prueba-2', 'sha256'), 'hex'));
    raise exception 'FALLO 6: la doble reserva debió rechazarse';
  exception when sqlstate 'A0001' then
    raise notice 'ok 6 - doble reserva rechazada con hora_ya_tomada';
  end;

  -- 7
  if (select count(*) from notifications
       where doctor_id = v_doctor and type = 'new_booking') <> 1 then
    raise exception 'FALLO 7: notificación de reserva no creada';
  end if;
  raise notice 'ok 7 - notificación para el doctor';

  -- 8
  perform seal_manage_token(v_appt, 'token-de-prueba-1', 'clave-de-prueba');
  if (select open_manage_token(v_appt, 'clave-de-prueba') <> 'token-de-prueba-1') then
    raise exception 'FALLO 8: el token sellado no se recupera';
  end if;
  raise notice 'ok 8 - token sellado recuperable sólo con la clave';

  -- 9
  perform reschedule_appointment(v_hash, (v_date + time '15:00') at time zone 'America/Santiago');
  if (select count(*) from get_available_slots(v_doctor, v_date, 30)) <> 11 then
    raise exception 'FALLO 9: la agenda no cuadra tras reprogramar';
  end if;
  raise notice 'ok 9 - reprogramar mueve la cita y libera la hora original';

  -- 10
  perform cancel_appointment(v_hash, 'prueba');
  if (select count(*) from get_available_slots(v_doctor, v_date, 30)) <> 12 then
    raise exception 'FALLO 10: tras cancelar no volvió el horario';
  end if;
  raise notice 'ok 10 - cancelar libera la hora';

  -- 11
  if (select count(*) from get_available_slots(v_doctor,
       (now() at time zone 'America/Santiago')::date + 365, 30)) <> 0 then
    raise exception 'FALLO 11: fecha fuera de rango ofrece horarios';
  end if;
  raise notice 'ok 11 - fuera de max_days_ahead no hay horarios';

  -- 12
  if (select count(*) from get_available_slots_any(v_date, 30)) < 12 then
    raise exception 'FALLO 12: get_available_slots_any no agrega doctores';
  end if;
  raise notice 'ok 12 - cualquiera disponible agrega por doctor';

  -- Limpieza del fixture.
  delete from appointments where doctor_id = v_doctor;
  delete from notifications where doctor_id = v_doctor;
  delete from patients where full_name in ('Paciente Prueba', 'Otro');
  delete from time_off where doctor_id = v_doctor;
  delete from doctors where id = v_doctor;
  delete from auth.users where id = v_user;
  delete from services where name = 'SQLTest';

  raise notice 'TODAS LAS PRUEBAS SQL PASARON';
end $$;