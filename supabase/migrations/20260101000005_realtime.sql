-- =====================================================================
-- 0005 · Realtime
--
-- El dashboard del doctor se suscribe a `notifications` (y a
-- `appointments` para refrescar la agenda). RLS filtra por doctor_id,
-- así que cada sesión sólo recibe lo suyo.
-- =====================================================================

alter table notifications replica identity full;
alter table appointments replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'appointments'
  ) then
    alter publication supabase_realtime add table public.appointments;
  end if;
end
$$;