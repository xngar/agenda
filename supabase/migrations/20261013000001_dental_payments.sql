-- Pagos y abonos del plan de tratamiento dental.
--
-- Un pago es dinero recibido del paciente, opcionalmente ligado a un item del
-- plan. El saldo (total aceptado menos total pagado) se calcula en la app.

create table public.dental_payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  patient_id uuid not null references public.patients (id),
  plan_item_id uuid references public.dental_treatment_plan_items (id),
  amount numeric not null check (amount > 0),
  paid_at date not null default CURRENT_DATE,
  method text not null default 'efectivo'
    check (method in ('efectivo', 'transferencia', 'tarjeta', 'otro')),
  note text,
  created_by uuid references public.doctors (id),
  created_at timestamptz not null default now()
);

create index dental_payments_org_patient_idx on public.dental_payments (org_id, patient_id);

alter table public.dental_payments enable row level security;

-- El equipo clínico lee y registra; sólo el admin elimina.
grant select, insert on public.dental_payments to authenticated;
grant delete on public.dental_payments to authenticated;

drop policy if exists dental_payments_clinical_read on public.dental_payments;
create policy dental_payments_clinical_read on public.dental_payments
  for select to authenticated
  using (org_id = auth_org_id() and is_clinical());

drop policy if exists dental_payments_clinical_insert on public.dental_payments;
create policy dental_payments_clinical_insert on public.dental_payments
  for insert to authenticated
  with check (org_id = auth_org_id() and is_clinical());

drop policy if exists dental_payments_admin_delete on public.dental_payments;
create policy dental_payments_admin_delete on public.dental_payments
  for delete to authenticated
  using (org_id = auth_org_id() and is_admin());

drop trigger if exists dental_payments_audit on public.dental_payments;
create trigger dental_payments_audit after insert or update or delete on public.dental_payments
  for each row execute function audit_log_change();
