alter table public.doctors
  add column avatar_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'perfil-profesionales',
  'perfil-profesionales',
  false,
  204800,
  array['image/jpeg']
)
on conflict (id) do update
set public = false,
    file_size_limit = 204800,
    allowed_mime_types = array['image/jpeg'];
