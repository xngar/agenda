-- book_appointment hace `on conflict (org_id, lower(email)) do update`.
-- La migración de ficha dejó ese único como índice PARCIAL (WHERE email <> ''),
-- y Postgres no infiere conflict targets sobre índices parciales (42P10), lo que
-- rompía cualquier reserva pública. Se devuelve a un único completo: los NULL
-- siguen sin chocar (NULL <> NULL en unique) y no hay duplicados reales.
drop index if exists public.patients_org_email_uq;

create unique index patients_org_email_uq
  on public.patients (org_id, lower(email));