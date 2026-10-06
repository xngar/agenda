-- 0014_replace_availability_rules.sql
--
-- Por qué: `availability_rules` ya era administrable vía RLS (0004), pero no
-- había ni API ni interfaz: cambiar el horario de atención exigía escribir
-- SQL a mano. Esta función es la pieza que hace falta para un formulario.
--
-- Reemplazo completo y no edición fila por fila: el usuario piensa en "los
-- horarios del martes", no en ids de reglas. Cambiar fila por fila obliga a
-- calcular altas, bajas y cambios en el cliente y a aplicar tres peticiones
-- sin transacción.
--
-- `security invoker` (igual que `dashboard_appointments`): RLS sigue mandando,
-- de modo que un profesional sólo puede reemplazar sus propias reglas y un
-- admin, las de cualquiera. Si la API no autroliza antes, el `delete` no
-- borra nada y el `insert` falla en la comprobación de RLS.
--
-- Es plpgsql y no sql a propósito: necesitas `delete` y `create` en la MISMA
-- transacción. Con dos peticiones de PostgREST, un `insert` fallido dejaría el
-- horario vacío.

create or replace function public.replace_availability_rules(
  p_doctor uuid,
  p_rules jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from availability_rules where doctor_id = p_doctor;

  insert into availability_rules (doctor_id, weekday, start_time, end_time)
  select
    p_doctor,
    (r ->> 'weekday')::int,
    (r ->> 'startTime')::time,
    (r ->> 'endTime')::time
  from jsonb_array_elements(p_rules) as r;
end;
$$;

-- La ejecución no se abre a anon: aunque RLS lo rechazaría igual (no hay
-- política para anon), que cualquiera pueda invocarla es ruido innecesario.
revoke execute on function public.replace_availability_rules(uuid, jsonb)
  from public, anon;

grant execute on function public.replace_availability_rules(uuid, jsonb)
  to authenticated;

comment on function public.replace_availability_rules(uuid, jsonb) is
  'Reemplaza completo el horario semanal de un profesional en una sola
   transacción. Corre con el rol de quien llama, así que RLS decide qué
   profesional se puede tocar.';