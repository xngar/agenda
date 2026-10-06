-- 20260102000003 · RLS por organizacion (Fase 4)
alter table organizations enable row level security;
create or replace function auth_org_id()
returns uuid
language sql stable
security definer
set search_path = public, pg_temp
as 
  select org_id from doctors where id = auth.uid() and active;
;
create or replace function is_admin()
returns boolean
language sql stable
security definer
set search_path = public, pg_temp
as 
  select coalesce((select d.is_admin from doctors d where d.id = auth.uid() and d.active), false);
;
create or replace function is_super_admin()
returns boolean
language sql stable
security definer
set search_path = public, pg_temp
as 
  select coalesce((select d.is_super_admin from doctors d where d.id = auth.uid() and d.active), false);
;
grant execute on function is_super_admin() to authenticated, service_role;
grant execute on function auth_org_id() to authenticated, service_role;
