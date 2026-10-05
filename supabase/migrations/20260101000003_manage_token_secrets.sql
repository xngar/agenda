-- =====================================================================
-- 0003 · Token de gestión: hash para comparar, copia sellada para el
--        recordatorio por correo.
--
-- appointments.manage_token_hash (SHA-256) es la única forma de *buscar*
-- una cita. Para poder reenviar el link /cita/[token] 24 h antes se
-- guarda además una copia cifrada con pgp_sym_encrypt usando una clave
-- que vive en el servidor (MANAGE_TOKEN_KEY). Sin esa clave, la base no
-- permite recuperar ningún token en claro.
-- =====================================================================

create table manage_token_secrets (
  appointment_id uuid primary key references appointments(id) on delete cascade,
  sealed text not null,
  sealed_at timestamptz not null default now()
);

-- Only the service role may call these: `grant execute` is explicit and
-- RLS stays on (no policies => no rows for anon/authenticated).
create or replace function seal_manage_token(p_appointment uuid, p_token text, p_key text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into manage_token_secrets (appointment_id, sealed)
  -- pgcrypto vive en `extensions`, fuera del search_path fijo: se califica.
  values (p_appointment, extensions.pgp_sym_encrypt(p_token, p_key, 'cipher-algo=aes256'))
  on conflict (appointment_id)
  do update set sealed = excluded.sealed, sealed_at = now();
$$;

create or replace function open_manage_token(p_appointment uuid, p_key text)
returns text
language sql
security definer
set search_path = public, pg_temp
as $$
  select extensions.pgp_sym_decrypt(sealed::bytea, p_key, 'cipher-algo=aes256')
  from manage_token_secrets
  where appointment_id = p_appointment;
$$;

revoke all on table manage_token_secrets from anon, authenticated;
revoke all on function seal_manage_token(uuid, text, text) from public;
revoke all on function open_manage_token(uuid, text) from public;