-- 20261021000001 · Estadísticas del panel
--
-- Lecturas agregadas (RLS intacta) para el módulo "Estadísticas":
--   · stats_kpis:            KPIs del rango (citas, ocupación, asistencia…)
--   · stats_available_minutes: capacidad real del horario (reglas − feriados/bloqueos)
--   · stats_daily:           serie por día
--   · stats_patients:        pacientes nuevos vs recurrentes por mes
--   · stats_services:        ranking de servicios
--   · stats_heatmap:         mapa de calor día × hora
--   · stats_inactive_patients: count de pacientes sin citas en N meses
-- `stats_doctor_filter` fija el alcance: admin/recepción pueden elegir
-- profesional; cualquier otro rol queda fijado a su propio id.
-- No destructiva: sólo columnas nullable y funciones SECURITY INVOKER.

-- ---------------------------------------------------------------------------
-- Columnas nuevas (nullable, compatibles con los datos existentes)
-- ---------------------------------------------------------------------------

alter table appointments
  add column if not exists cancelled_at timestamptz,
  add column if not exists actual_start_at timestamptz,
  add column if not exists actual_end_at timestamptz;

alter table services
  add column if not exists price numeric(10,2) check (price is null or price >= 0);

create index if not exists appointments_org_doctor_start_idx
  on appointments (org_id, doctor_id, lower(during));

-- ---------------------------------------------------------------------------
-- Helper común: si el rol no es admin/recepción, fija el filtro a su propio id,
-- sin importar lo que la UI pida.
-- ---------------------------------------------------------------------------

create or replace function stats_doctor_filter(p_doctor uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when is_admin() or staff_role() = 'reception' then p_doctor
    else auth.uid()
  end;
$$;

revoke execute on function stats_doctor_filter(uuid) from public, anon;
grant execute on function stats_doctor_filter(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- KPIs del rango. La UI lo llama dos veces: periodo actual y periodo previo.
-- ---------------------------------------------------------------------------

create or replace function stats_kpis(
  p_from date,
  p_to date,
  p_doctor uuid default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with tz as (
    select coalesce(
      (select timezone from organizations where id = auth_org_id()),
      'America/Santiago'
    ) as z
  ),
  v_doctor as (
    select stats_doctor_filter(p_doctor) as id
  ),
  base as (
    -- Citas del rango. RLS limita por organización/rol; `stats_doctor_filter`
    -- fija el alcance del profesional.
    select
      a.status,
      a.cancelled_by,
      a.cancelled_at,
      a.during,
      a.patient_id,
      a.service_id,
      (lower(a.during) at time zone tk.z) as start_local
    from appointments a
    cross join tz tk
    cross join v_doctor vd
    where a.org_id = auth_org_id()
      and (vd.id is null or a.doctor_id = vd.id)
      and lower(a.during) >= p_from::timestamp at time zone tk.z
      and lower(a.during) < (p_to + 1)::timestamp at time zone tk.z
  ),
  agenda as (
    select
      count(*)::int as citas,
      coalesce(sum(extract(epoch from (upper(during) - lower(during))) / 3600), 0)::numeric as horas
    from base
    where status in ('pending', 'confirmed', 'completed', 'no_show')
  ),
  ausencias as (
    select
      count(*) filter (where status = 'no_show')::int as no_shows,
      count(*) filter (where status = 'completed')::int as completadas
    from base
  ),
  bajas as (
    select
      count(*) filter (where status = 'cancelled' and cancelled_by = 'patient')::int as paciente,
      count(*) filter (where status = 'cancelled' and cancelled_by = 'doctor')::int as profesional,
      count(*) filter (
        where status = 'cancelled'
          and cancelled_at is not null
          and cancelled_at > lower(during) - interval '24 hours'
      )::int as tardias
    from base
  ),
  -- Historial sin filtro de rango, para saber si un paciente es nuevo.
  historia as (
    select
      a.patient_id,
      (lower(a.during) at time zone tk.z) as start_local
    from appointments a
    cross join tz tk
    cross join v_doctor vd
    where a.org_id = auth_org_id()
      and (vd.id is null or a.doctor_id = vd.id)
  ),
  pacientes as (
    select
      count(*) filter (where min_local::date between p_from and p_to)::int as nuevos,
      count(*) filter (
        where min_local < p_from::timestamp at time zone (select z from tz)
          and max_local >= p_from::timestamp at time zone (select z from tz)
      )::int as recurrentes
    from (
      select
        patient_id,
        min(start_local) as min_local,
        max(start_local) as max_local
      from historia
      group by patient_id
    ) por_paciente
  ),
  perdidas as (
    select coalesce(sum(sv.price), 0)::numeric as total
    from base b
    left join services sv on sv.id = b.service_id
    where b.status = 'no_show'
       or (
         b.status = 'cancelled'
         and b.cancelled_at is not null
         and b.cancelled_at > lower(b.during) - interval '24 hours'
       )
  )
  select jsonb_build_object(
    'citas', (select citas from agenda),
    'horas_agendadas', (select horas from agenda),
    'ocupacion', (select case
      when stats_available_minutes(p_from, p_to, (select id from v_doctor)) > 0
      then round(
        100.0 * (select horas from agenda) / stats_available_minutes(p_from, p_to, (select id from v_doctor)),
        1
      )
      else null
    end),
    'inasistencia', (select case
      when no_shows + completadas = 0 then null
      else round(100.0 * no_shows / (no_shows + completadas), 1)
    end from ausencias),
    'canceladas_paciente', (select paciente from bajas),
    'canceladas_profesional', (select profesional from bajas),
    'canceladas_tardias', (select tardias from bajas),
    'pacientes_nuevos', (select nuevos from pacientes),
    'pacientes_recurrentes', (select recurrentes from pacientes),
    'ingreso_perdido', (select total from perdidas),
    'precios_configurados', exists (
      select 1
      from services sv
      where sv.org_id = auth_org_id() and sv.price is not null
    )
  );
$$;

revoke execute on function stats_kpis(date, date, uuid) from public, anon;
grant execute on function stats_kpis(date, date, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Capacidad disponible (horas) según horario real: availability_rules por día
-- de la semana, menos feriados y time_off.
-- ---------------------------------------------------------------------------

create or replace function stats_available_minutes(
  p_from date,
  p_to date,
  p_doctor uuid default null
)
returns numeric
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with tz as (
    select coalesce(
      (select timezone from organizations where id = auth_org_id()),
      'America/Santiago'
    ) as z
  ),
  v_doctor as (
    select stats_doctor_filter(p_doctor) as id
  ),
  dias as (
    select
      s.dia::date as dia,
      extract(dow from s.dia)::int as dow
    from generate_series(p_from, p_to, interval '1 day') as s(dia)
    cross join tz
    where s.dia::date not in (
      select date from clinic_holidays where org_id = auth_org_id()
    )
  ),
  reglas_dia as (
    select
      dd.dia,
      r.doctor_id,
      r.start_time,
      r.end_time
    from availability_rules r
    join doctors dc on dc.id = r.doctor_id
    join dias dd on dd.dow = r.weekday
    cross join v_doctor vd
    where dc.org_id = auth_org_id()
      and dc.active
      and (vd.id is null or r.doctor_id = vd.id)
  )
  select coalesce(sum(
    extract(epoch from (r.end_time - r.start_time)) / 60
    - coalesce(tr.bloqueado, 0)
  ), 0)::numeric
  from reglas_dia r
  cross join tz tk
  left join lateral (
    -- Intersección del bloqueo con la ventana horaria del día, convertida
    -- a la zona horaria de la clínica para comparar las mismas horas.
    select coalesce(sum(
      case
        when lower(t.during) at time zone tk.z < r.dia + r.end_time
          and upper(t.during) at time zone tk.z > r.dia + r.start_time
        then extract(epoch from (
          least(upper(t.during) at time zone tk.z, r.dia + r.end_time)
          - greatest(lower(t.during) at time zone tk.z, r.dia + r.start_time)
        )) / 60
        else 0
      end
    ), 0) as bloqueado
    from time_off t
    where t.doctor_id = r.doctor_id
  ) tr on true;
$$;

revoke execute on function stats_available_minutes(date, date, uuid) from public, anon;
grant execute on function stats_available_minutes(date, date, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Serie por día
-- ---------------------------------------------------------------------------

create or replace function stats_daily(
  p_from date,
  p_to date,
  p_doctor uuid default null
)
returns table(day date, total int, completadas int, no_shows int, canceladas int, pendientes int)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with tz as (
    select coalesce(
      (select timezone from organizations where id = auth_org_id()),
      'America/Santiago'
    ) as z
  ),
  v_doctor as (
    select stats_doctor_filter(p_doctor) as id
  ),
  citas as (
    select
      (lower(a.during) at time zone tk.z)::date as dia,
      count(*)::int as total,
      count(*) filter (where a.status = 'completed')::int as completadas,
      count(*) filter (where a.status = 'no_show')::int as no_shows,
      count(*) filter (where a.status = 'cancelled')::int as canceladas,
      count(*) filter (where a.status in ('pending', 'confirmed'))::int as pendientes
    from appointments a
    cross join tz tk
    cross join v_doctor vd
    where a.org_id = auth_org_id()
      and (vd.id is null or a.doctor_id = vd.id)
      and lower(a.during) >= p_from::timestamp at time zone tk.z
      and lower(a.during) < (p_to + 1)::timestamp at time zone tk.z
    group by 1
  )
  select
    s.dia::date as day,
    coalesce(c.total, 0)::int as total,
    coalesce(c.completadas, 0)::int as completadas,
    coalesce(c.no_shows, 0)::int as no_shows,
    coalesce(c.canceladas, 0)::int as canceladas,
    coalesce(c.pendientes, 0)::int as pendientes
  from generate_series(p_from, p_to, interval '1 day') as s(dia)
  left join citas c on c.dia = s.dia::date
  order by 1;
$$;

revoke execute on function stats_daily(date, date, uuid) from public, anon;
grant execute on function stats_daily(date, date, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Pacientes por mes: nuevos (su primera cita en el mes) vs recurrentes (más de
-- una cita del mismo paciente en el mes).
-- ---------------------------------------------------------------------------

create or replace function stats_patients(
  p_from date,
  p_to date,
  p_doctor uuid default null
)
returns table(mes date, nuevos int, recurrentes int)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with tz as (
    select coalesce(
      (select timezone from organizations where id = auth_org_id()),
      'America/Santiago'
    ) as z
  ),
  v_doctor as (
    select stats_doctor_filter(p_doctor) as id
  ),
  citas_periodo as (
    select
      a.patient_id,
      (lower(a.during) at time zone tk.z) as start_local,
      (lower(a.during) at time zone tk.z)::date as dia
    from appointments a
    cross join tz tk
    cross join v_doctor vd
    where a.org_id = auth_org_id()
      and (vd.id is null or a.doctor_id = vd.id)
      and lower(a.during) >= p_from::timestamp at time zone tk.z
      and lower(a.during) < (p_to + 1)::timestamp at time zone tk.z
  ),
  conteo as (
    select patient_id, count(*) as n
    from citas_periodo
    group by patient_id
  ),
  primera_global as (
    select patient_id, min(lower(a.during) at time zone tk.z)::date as first_day
    from appointments a
    cross join tz tk
    cross join v_doctor vd
    where a.org_id = auth_org_id()
      and (vd.id is null or a.doctor_id = vd.id)
    group by patient_id
  )
  -- "Nuevo" = este mes atiende por primera vez. "Recurrente" = volvió ≥ 1 vez.
  select
    date_trunc('month', cp.start_local)::date as mes,
    count(distinct pr.patient_id)::int as nuevos,
    count(distinct case when rc.n > 1 then cp.patient_id end)::int as recurrentes
  from citas_periodo cp
  join conteo rc on rc.patient_id = cp.patient_id
  left join primera_global pr
    on pr.patient_id = cp.patient_id
   and pr.first_day between p_from and p_to
  group by 1
  order by 1;
$$;

revoke execute on function stats_patients(date, date, uuid) from public, anon;
grant execute on function stats_patients(date, date, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Ranking de servicios
-- ---------------------------------------------------------------------------

create or replace function stats_services(
  p_from date,
  p_to date,
  p_doctor uuid default null
)
returns table(service_name text, total int, precio numeric, ingreso numeric)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with tz as (
    select coalesce(
      (select timezone from organizations where id = auth_org_id()),
      'America/Santiago'
    ) as z
  ),
  v_doctor as (
    select stats_doctor_filter(p_doctor) as id
  )
  select
    coalesce(sv.name, '(sin servicio)') as service_name,
    count(*)::int as total,
    min(sv.price) as precio,
    coalesce(sum(
      case when a.status <> 'cancelled' then coalesce(sv.price, 0) else 0 end
    ), 0)::numeric as ingreso
  from appointments a
  cross join tz tk
  cross join v_doctor vd
  left join services sv on sv.id = a.service_id
  where a.org_id = auth_org_id()
    and (vd.id is null or a.doctor_id = vd.id)
    and lower(a.during) >= p_from::timestamp at time zone tk.z
    and lower(a.during) < (p_to + 1)::timestamp at time zone tk.z
  group by sv.name
  order by total desc, service_name asc;
$$;

revoke execute on function stats_services(date, date, uuid) from public, anon;
grant execute on function stats_services(date, date, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Mapa de calor: día de la semana (ISO 1=Lun .. 7=Dom) × hora local
-- ---------------------------------------------------------------------------

create or replace function stats_heatmap(
  p_from date,
  p_to date,
  p_doctor uuid default null
)
returns table(dow int, hora int, total int)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with tz as (
    select coalesce(
      (select timezone from organizations where id = auth_org_id()),
      'America/Santiago'
    ) as z
  ),
  v_doctor as (
    select stats_doctor_filter(p_doctor) as id
  )
  select
    extract(isodow from lower(a.during) at time zone tk.z)::int as dow,
    extract(hour from lower(a.during) at time zone tk.z)::int as hora,
    count(*)::int as total
  from appointments a
  cross join tz tk
  cross join v_doctor vd
  where a.org_id = auth_org_id()
    and (vd.id is null or a.doctor_id = vd.id)
    and lower(a.during) >= p_from::timestamp at time zone tk.z
    and lower(a.during) < (p_to + 1)::timestamp at time zone tk.z
  group by 1, 2
  order by 1, 2;
$$;

revoke execute on function stats_heatmap(date, date, uuid) from public, anon;
grant execute on function stats_heatmap(date, date, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Pacientes inactivos: histórico pero sin citas en los últimos N meses
-- ---------------------------------------------------------------------------

create or replace function stats_inactive_patients(
  p_months int default 6,
  p_doctor uuid default null
)
returns int
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with tz as (
    select coalesce(
      (select timezone from organizations where id = auth_org_id()),
      'America/Santiago'
    ) as z
  ),
  v_doctor as (
    select stats_doctor_filter(p_doctor) as id
  ),
  historial as (
    select
      a.patient_id,
      max(lower(a.during) at time zone tk.z) as last_local
    from appointments a
    cross join tz tk
    cross join v_doctor vd
    where a.org_id = auth_org_id()
      and (vd.id is null or a.doctor_id = vd.id)
    group by a.patient_id
  )
  select count(*)::int
  from historial h
  cross join tz tk2
  where h.last_local < now() at time zone tk2.z - make_interval(months => p_months);
$$;

revoke execute on function stats_inactive_patients(int, uuid) from public, anon;
grant execute on function stats_inactive_patients(int, uuid) to authenticated;
