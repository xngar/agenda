-- 20260107000018 · list_patients_contact con filtros, orden y paginación
--
-- El listado de recepción ignoraba q/estado (la página solo filtraba en la
-- rama clínica) y traía todo de golpe, con un corte silencioso de 100 filas.
-- La RPC ahora filtra por nombre/RUT/correo y estado, ordena según un
-- whitelist resuelto en SQL, pagina con limit/offset y devuelve `total`
-- (count(*) over()) para armar la paginación.

drop function if exists list_patients_contact();

create function list_patients_contact(
  p_q text default null,
  p_status text default null,
  p_limit int default 25,
  p_offset int default 0,
  p_sort text default 'full_name',
  p_dir text default 'asc'
)
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
  created_at timestamptz,
  total bigint
)
language sql
security definer
set search_path = public, pg_temp
as $$
  with base as (
    select p.*,
      case p_sort
        when 'rut' then p.rut
        when 'patient_status' then p.patient_status
        when 'birth_date' then to_char(p.birth_date, 'YYYY-MM-DD')
        else p.full_name
      end as sort_key,
      count(*) over() as total
    from patients p
    where p.org_id = auth_org_id()
      and (
        p_q is null or p_q = '' or
        p.full_name ilike '%' || p_q || '%' or
        p.rut ilike '%' || p_q || '%' or
        p.email ilike '%' || p_q || '%'
      )
      and (p_status is null or p_status = '' or p.patient_status = p_status)
  )
  select id, org_id, full_name, nombres, apellido_paterno, apellido_materno,
         rut, phone, email, birth_date, sex, address, comuna, region,
         consent_at, admitted_at, created_at, total
  from base
  order by
    case when p_dir = 'desc' then sort_key end desc nulls last,
    sort_key asc nulls last,
    id asc
  limit greatest(p_limit, 1) offset greatest(p_offset, 0);
$$;

revoke all on function list_patients_contact(text, text, int, int, text, text)
  from anon, public, authenticated;
grant execute on function list_patients_contact(text, text, int, int, text, text)
  to authenticated;
