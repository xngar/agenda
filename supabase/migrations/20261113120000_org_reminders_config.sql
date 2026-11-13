alter table public.organizations
  add column if not exists reminders_enabled boolean not null default true,
  add column if not exists reminder_hours_before int not null default 24
    check (reminder_hours_before in (12, 24, 48, 72));

create or replace function public.claim_due_reminders()
returns table(
  appointment_id uuid,
  doctor_id uuid,
  patient_email text,
  patient_name text,
  service_name text,
  starts_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  with due as (
    select a.id, a.doctor_id, a.patient_id, a.service_id, lower(a.during) as starts_at
    from appointments a
    join organizations o on o.id = a.org_id
    where a.status = 'confirmed'
      and a.reminder_sent_at is null
      and o.active = true
      and coalesce(o.reminders_enabled, true) = true
      and lower(a.during) between now() and now() + make_interval(hours => coalesce(o.reminder_hours_before, 24))
    order by lower(a.during)
    limit 200
    for update of a skip locked
  )
  update appointments a
  set reminder_sent_at = now()
  from due d
  join patients p on p.id = d.patient_id
  left join services s on s.id = d.service_id
  where a.id = d.id
  returning a.id,
            a.doctor_id,
            p.email,
            p.full_name,
            s.name,
            d.starts_at;
$$;

comment on function public.claim_due_reminders() is
  'Marca reminder_sent_at en la misma transacción y devuelve lo vencido según la configuración de cada organización (máx. 200).';

