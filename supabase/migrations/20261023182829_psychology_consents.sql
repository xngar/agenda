alter table public.consents
  add column accepted_by_name text,
  add column accepted_by_relation text,
  add column acceptance_method text not null default 'por_verificar'
    check (acceptance_method in ('verbal', 'documento', 'remoto', 'por_verificar'));
