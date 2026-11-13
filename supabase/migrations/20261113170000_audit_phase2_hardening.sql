-- 20261113170000 · Endurecimiento e inmutabilidad normativa de auditoría y ficha (Fase 2)
--
-- Cumplimiento Ley 20.584 y DS 41/2012 MINSAL (arts. 8 y 11):
-- 1. `audit_log` estrictamente append-only: prohibición de UPDATE/DELETE para
--    usuarios autenticados y bloqueo incondicional de UPDATE.
-- 2. Inmutabilidad de `encounter_versions` y `consents` (registros firmados).
-- 3. Cambio de claves foráneas clínicas de ON DELETE CASCADE a ON DELETE RESTRICT
--    para impedir borrados en cascada de historia clínica.
-- 4. Vínculo asistencial obligatorio (`patient_has_care`) en `dental_payments`.
-- 5. Validación de cuenta activa y vínculo en `patient_contact_event`.

revoke insert, update, delete, truncate on public.audit_log from public, anon, authenticated;
revoke update, delete, truncate on public.encounter_versions from public, anon, authenticated;
revoke update, delete, truncate on public.consents from public, anon, authenticated;
revoke update, delete, truncate on public.prescriptions from public, anon, authenticated;

create index if not exists audit_log_org_summary_patient_idx
  on public.audit_log (org_id, ((summary ->> 'patient_id')))
  where summary ? 'patient_id';

create or replace function public.audit_log_prevent_mutation()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
begin
  if tg_op = 'UPDATE' then
    raise exception using errcode = '42501', message = 'audit_log_immutable';
  end if;

  if tg_op = 'DELETE'
     and coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception using errcode = '42501', message = 'audit_log_immutable';
  end if;

  return old;
end;
$function$;

drop trigger if exists audit_log_immutable_trigger on public.audit_log;
create trigger audit_log_immutable_trigger
  before update or delete on public.audit_log
  for each row execute function public.audit_log_prevent_mutation();

create or replace function public.immutable_clinical_record_guard()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
begin
  if tg_op = 'UPDATE' then
    raise exception using errcode = '42501', message = 'clinical_record_immutable';
  end if;

  if tg_op = 'DELETE'
     and coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception using errcode = '42501', message = 'clinical_record_immutable';
  end if;

  return old;
end;
$function$;

drop trigger if exists encounter_versions_immutable_trigger on public.encounter_versions;
create trigger encounter_versions_immutable_trigger
  before update or delete on public.encounter_versions
  for each row execute function public.immutable_clinical_record_guard();

drop trigger if exists consents_immutable_trigger on public.consents;
create trigger consents_immutable_trigger
  before update or delete on public.consents
  for each row execute function public.immutable_clinical_record_guard();

-- Reemplazo de ON DELETE CASCADE por ON DELETE RESTRICT en tablas clínicas
alter table public.patient_medical_background
  drop constraint if exists patient_medical_background_patient_id_fkey,
  add constraint patient_medical_background_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete restrict;

alter table public.encounters
  drop constraint if exists encounters_patient_id_fkey,
  add constraint encounters_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete restrict;

alter table public.encounter_versions
  drop constraint if exists encounter_versions_patient_id_fkey,
  add constraint encounter_versions_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete restrict,
  drop constraint if exists encounter_versions_encounter_id_fkey,
  add constraint encounter_versions_encounter_id_fkey
    foreign key (encounter_id) references public.encounters(id) on delete restrict;

alter table public.attachments
  drop constraint if exists attachments_patient_id_fkey,
  add constraint attachments_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete restrict;

alter table public.consents
  drop constraint if exists consents_patient_id_fkey,
  add constraint consents_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete restrict;

alter table public.prescriptions
  drop constraint if exists prescriptions_patient_id_fkey,
  add constraint prescriptions_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete restrict;

alter table public.dental_chart_entries
  drop constraint if exists dental_chart_entries_patient_id_fkey,
  add constraint dental_chart_entries_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete restrict;

alter table public.periodontal_records
  drop constraint if exists periodontal_records_patient_id_fkey,
  add constraint periodontal_records_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete restrict;

alter table public.dental_treatment_plan_items
  drop constraint if exists dental_treatment_plan_items_patient_id_fkey,
  add constraint dental_treatment_plan_items_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete restrict;

-- Vínculo asistencial en pagos del plan dental
drop policy if exists dental_payments_clinical_read on public.dental_payments;
create policy dental_payments_clinical_read on public.dental_payments
  for select to authenticated
  using (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
  );

drop policy if exists dental_payments_clinical_insert on public.dental_payments;
create policy dental_payments_clinical_insert on public.dental_payments
  for insert to authenticated
  with check (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
  );

-- Conservación de adjuntos clínicos: bloquea eliminar adjuntos de atenciones
-- firmadas o que respalden un consentimiento informado (DS 41/2012 MINSAL, 15 años).
drop policy if exists attachments_clinical_delete on public.attachments;
create policy attachments_clinical_delete on public.attachments
  for delete to authenticated
  using (
    org_id = auth_org_id()
    and (
      is_admin()
      or is_super_admin()
      or (
        is_clinical()
        and exists (
          select 1
            from public.patients p
           where p.id = attachments.patient_id
             and p.org_id = auth_org_id()
             and p.doctor_id = auth.uid()
        )
      )
    )
    and not exists (
      select 1
        from public.encounters e
       where e.id = attachments.encounter_id
         and e.org_id = attachments.org_id
         and e.status = 'signed'
    )
    and not exists (
      select 1
        from public.consents c
       where c.evidence_attachment_id = attachments.id
    )
  );

-- Endurecimiento de patient_contact_event
create or replace function public.patient_contact_event(
  p_patient_id uuid,
  p_channel text default 'whatsapp'
)
returns void
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_org uuid;
  v_patient_org uuid;
begin
  select d.org_id
    into v_org
    from doctors d
   where d.id = auth.uid()
     and d.active;

  select p.org_id
    into v_patient_org
    from patients p
   where p.id = p_patient_id;

  if v_org is null or v_patient_org is null or v_patient_org <> v_org then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  if not (
    is_admin()
    or is_super_admin()
    or staff_role() = 'reception'
    or (is_clinical() and patient_has_care(p_patient_id))
  ) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  insert into audit_log (org_id, actor_id, action, entity, entity_id, summary)
  values (
    v_org,
    auth.uid(),
    'contact',
    'patients',
    p_patient_id::text,
    jsonb_build_object(
      'channel', coalesce(nullif(p_channel, ''), 'whatsapp'),
      'patient_id', p_patient_id::text
    )
  );
end;
$function$;

