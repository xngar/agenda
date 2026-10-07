-- 20260102000008 · Ficha clínica: RLS por roles, auditoría y acceso a archivos
--
-- Roles de doctor (doctors.role): professional (acceso clínico),
-- reception (sólo contacto y agenda) y admin (is_admin, gestión).
-- Las firmas de atenciones son inmutables: el UPDATE se bloquea por RLS
-- sobre draft y por trigger sobre filas firmadas. Todo cambio se audita.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function staff_role()
returns text
language sql stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select role from doctors where id = auth.uid() and active), '');
$$;

-- Acceso clínico: profesionales y administradores de clínica (no recepción).
create or replace function is_clinical()
returns boolean
language sql stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(staff_role() in ('professional', 'admin'), false) or is_super_admin();
$$;

grant execute on function staff_role() to authenticated, service_role;
grant execute on function is_clinical() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS + políticas
-- ---------------------------------------------------------------------------
alter table organizations enable row level security; -- ya estaba; idempotente
alter table organization_types enable row level security;
alter table patient_medical_background enable row level security;
alter table encounters enable row level security;
alter table encounter_versions enable row level security;
alter table attachments enable row level security;
alter table consents enable row level security;
alter table prescriptions enable row level security;
alter table audit_log enable row level security;
alter table dental_treatments_catalog enable row level security;
alter table dental_chart_entries enable row level security;
alter table periodontal_records enable row level security;
alter table dental_treatment_plan_items enable row level security;

grant select on organization_types to authenticated;

-- patients: la lectura ya no cuelga de las citas; ahora pertenece a la org.
grant select, insert, update on patients to authenticated;
drop policy if exists doctor_read_linked_patients on patients;
drop policy if exists patients_clinical_read on patients;
create policy patients_clinical_read on patients
  for select to authenticated
  using (org_id = auth_org_id() and is_clinical());

drop policy if exists patients_clinical_manage on patients;
create policy patients_clinical_manage on patients
  for all to authenticated
  using (org_id = auth_org_id() and is_clinical())
  with check (org_id = auth_org_id() and is_clinical());

-- patient_medical_background
grant select, insert, update on patient_medical_background to authenticated;
drop policy if exists background_clinical_read on patient_medical_background;
create policy background_clinical_read on patient_medical_background
  for select to authenticated
  using (org_id = auth_org_id() and is_clinical());

drop policy if exists background_clinical_manage on patient_medical_background;
create policy background_clinical_manage on patient_medical_background
  for all to authenticated
  using (org_id = auth_org_id() and is_clinical())
  with check (org_id = auth_org_id() and is_clinical());

-- encounters: borradores editables; firmadas inmutables.
grant select, insert, update on encounters to authenticated;
drop policy if exists encounters_clinical_read on encounters;
create policy encounters_clinical_read on encounters
  for select to authenticated
  using (org_id = auth_org_id() and is_clinical());

drop policy if exists encounters_clinical_insert on encounters;
create policy encounters_clinical_insert on encounters
  for insert to authenticated
  with check (org_id = auth_org_id() and is_clinical());

drop policy if exists encounters_draft_update on encounters;
create policy encounters_draft_update on encounters
  for update to authenticated
  using (org_id = auth_org_id() and is_clinical() and status = 'draft')
  with check (org_id = auth_org_id() and is_clinical());

drop policy if exists encounters_draft_delete on encounters;
create policy encounters_draft_delete on encounters
  for delete to authenticated
  using (org_id = auth_org_id() and status = 'draft'
         and (doctor_id = auth.uid() or is_admin()));

-- encounter_versions: histórico de correcciones, solo lectura y alta.
grant select, insert on encounter_versions to authenticated;
drop policy if exists versions_clinical_read on encounter_versions;
create policy versions_clinical_read on encounter_versions
  for select to authenticated
  using (org_id = auth_org_id() and is_clinical());

drop policy if exists versions_clinical_insert on encounter_versions;
create policy versions_clinical_insert on encounter_versions
  for insert to authenticated
  with check (org_id = auth_org_id() and is_clinical());

-- attachments
grant select, insert on attachments to authenticated;
drop policy if exists attachments_clinical_read on attachments;
create policy attachments_clinical_read on attachments
  for select to authenticated
  using (org_id = auth_org_id() and is_clinical());

drop policy if exists attachments_clinical_insert on attachments;
create policy attachments_clinical_insert on attachments
  for insert to authenticated
  with check (org_id = auth_org_id() and is_clinical());

drop policy if exists attachments_admin_delete on attachments;
create policy attachments_admin_delete on attachments
  for delete to authenticated
  using (org_id = auth_org_id() and is_admin());

-- consents
grant select, insert on consents to authenticated;
drop policy if exists consents_clinical_read on consents;
create policy consents_clinical_read on consents
  for select to authenticated
  using (org_id = auth_org_id() and is_clinical());

drop policy if exists consents_clinical_insert on consents;
create policy consents_clinical_insert on consents
  for insert to authenticated
  with check (org_id = auth_org_id() and is_clinical());

-- prescriptions
grant select, insert on prescriptions to authenticated;
drop policy if exists prescriptions_clinical_read on prescriptions;
create policy prescriptions_clinical_read on prescriptions
  for select to authenticated
  using (org_id = auth_org_id() and is_clinical());

drop policy if exists prescriptions_clinical_insert on prescriptions;
create policy prescriptions_clinical_insert on prescriptions
  for insert to authenticated
  with check (org_id = auth_org_id() and is_clinical());

-- dental: catálogo lo administra el admin; el resto lo usa el equipo clínico.
grant select on dental_treatments_catalog to authenticated;
grant insert, update on dental_treatments_catalog to authenticated;
drop policy if exists dental_catalog_clinical_read on dental_treatments_catalog;
create policy dental_catalog_clinical_read on dental_treatments_catalog
  for select to authenticated
  using (org_id = auth_org_id() and is_clinical());

drop policy if exists dental_catalog_admin_manage on dental_treatments_catalog;
create policy dental_catalog_admin_manage on dental_treatments_catalog
  for all to authenticated
  using (org_id = auth_org_id() and is_admin())
  with check (org_id = auth_org_id() and is_admin());

grant select, insert on dental_chart_entries to authenticated;
drop policy if exists dental_chart_clinical_read on dental_chart_entries;
create policy dental_chart_clinical_read on dental_chart_entries
  for select to authenticated
  using (org_id = auth_org_id() and is_clinical());

drop policy if exists dental_chart_clinical_insert on dental_chart_entries;
create policy dental_chart_clinical_insert on dental_chart_entries
  for insert to authenticated
  with check (org_id = auth_org_id() and is_clinical());

grant select, insert on periodontal_records to authenticated;
drop policy if exists periodontal_clinical_read on periodontal_records;
create policy periodontal_clinical_read on periodontal_records
  for select to authenticated
  using (org_id = auth_org_id() and is_clinical());

drop policy if exists periodontal_clinical_insert on periodontal_records;
create policy periodontal_clinical_insert on periodontal_records
  for insert to authenticated
  with check (org_id = auth_org_id() and is_clinical());

grant select, insert, update on dental_treatment_plan_items to authenticated;
drop policy if exists treatment_plan_clinical_read on dental_treatment_plan_items;
create policy treatment_plan_clinical_read on dental_treatment_plan_items
  for select to authenticated
  using (org_id = auth_org_id() and is_clinical());

drop policy if exists treatment_plan_clinical_all on dental_treatment_plan_items;
create policy treatment_plan_clinical_all on dental_treatment_plan_items
  for all to authenticated
  using (org_id = auth_org_id() and is_clinical())
  with check (org_id = auth_org_id() and is_clinical());

-- audit_log: insertable sólo por el trigger (owner); lectura admin/superadmin.
grant select on audit_log to authenticated;
drop policy if exists audit_admin_read on audit_log;
create policy audit_admin_read on audit_log
  for select to authenticated
  using ((is_admin() and org_id = auth_org_id()) or is_super_admin());

-- appointments: la recepción ve la agenda de su organización (sin escribir).
grant select on appointments to authenticated;
drop policy if exists doctor_read_own_appointments on appointments;
create policy doctor_read_own_appointments on appointments
  for select to authenticated
  using (
    doctor_id = auth.uid()
    or (is_admin() and org_id = auth_org_id())
    or (staff_role() = 'reception' and org_id = auth_org_id())
  );

-- ---------------------------------------------------------------------------
-- Vista de recepción: contacto y datos de contacto, sin contenido clínico.
-- Corre como definer (evita el RLS de la tabla) con filtro estricto por
-- organización del llamante.
-- ---------------------------------------------------------------------------
drop view if exists v_patients_contact;
create view v_patients_contact as
select id, org_id, full_name, nombres, apellido_paterno, apellido_materno,
       rut, phone, email, birth_date, sex, address, comuna, region,
       consent_at, admitted_at, created_at
from patients
where org_id = auth_org_id();

grant select on v_patients_contact to authenticated;

-- ---------------------------------------------------------------------------
-- Trigger de inmutabilidad y firma de atenciones
-- ---------------------------------------------------------------------------
create or replace function encounters_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and old.status = 'signed' then
    raise exception using errcode = 'EFIRM', message = 'ficha_firmada_inmutable';
  end if;

  if tg_op = 'UPDATE' and new.status = 'signed' and old.status <> 'signed' then
    new.signed_by := auth.uid();
    new.signed_at := coalesce(new.signed_at, now());
    insert into encounter_versions (org_id, patient_id, encounter_id, author_id, reason, snapshot)
    values (new.org_id, new.patient_id, new.id, auth.uid(), 'Firma de atencion', to_jsonb(new));
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists encounters_guard_trigger on encounters;
create trigger encounters_guard_trigger
  before update on encounters
  for each row execute function encounters_guard();

-- ---------------------------------------------------------------------------
-- Auditoría automática de cambios (INSERT/UPDATE/DELETE)
-- ---------------------------------------------------------------------------
create or replace function audit_log_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
  v_entity_id text;
  v_summary jsonb;
begin
  if tg_op = 'DELETE' then
    v_org := old.org_id;
    v_entity_id := old.id::text;
    v_summary := to_jsonb(old);
  else
    v_org := new.org_id;
    v_entity_id := new.id::text;
    v_summary := to_jsonb(new);
  end if;

  insert into audit_log (org_id, actor_id, action, entity, entity_id, summary)
  values (v_org, auth.uid(), lower(tg_op), tg_table_name, v_entity_id, v_summary);

  return coalesce(new, old);
end;
$$;

create or replace function set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists patients_audit on patients;
create trigger patients_audit after insert or update or delete on patients
  for each row execute function audit_log_change();
drop trigger if exists patients_updated_at on patients;
create trigger patients_updated_at before update on patients
  for each row execute function set_updated_at();

drop trigger if exists background_audit on patient_medical_background;
create trigger background_audit after insert or update or delete on patient_medical_background
  for each row execute function audit_log_change();

drop trigger if exists encounters_audit on encounters;
create trigger encounters_audit after insert or update or delete on encounters
  for each row execute function audit_log_change();

drop trigger if exists versions_audit on encounter_versions;
create trigger versions_audit after insert or update or delete on encounter_versions
  for each row execute function audit_log_change();

drop trigger if exists attachments_audit on attachments;
create trigger attachments_audit after insert or update or delete on attachments
  for each row execute function audit_log_change();

drop trigger if exists consents_audit on consents;
create trigger consents_audit after insert or update or delete on consents
  for each row execute function audit_log_change();

drop trigger if exists prescriptions_audit on prescriptions;
create trigger prescriptions_audit after insert or update or delete on prescriptions
  for each row execute function audit_log_change();

drop trigger if exists dental_chart_audit on dental_chart_entries;
create trigger dental_chart_audit after insert or update or delete on dental_chart_entries
  for each row execute function audit_log_change();

drop trigger if exists periodontal_audit on periodontal_records;
create trigger periodontal_audit after insert or update or delete on periodontal_records
  for each row execute function audit_log_change();

drop trigger if exists treatment_plan_audit on dental_treatment_plan_items;
create trigger treatment_plan_audit after insert or update or delete on dental_treatment_plan_items
  for each row execute function audit_log_change();
drop trigger if exists treatment_plan_updated_at on dental_treatment_plan_items;
create trigger treatment_plan_updated_at before update on dental_treatment_plan_items
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Almacenamiento privado de la ficha: bucket 'ficha-adjuntos'.
-- Los objetos se guardan bajo {org_id}/... y las URLs se firman en el app.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('ficha-adjuntos', 'ficha-adjuntos', false)
on conflict (id) do nothing;

drop policy if exists "ficha_adjuntos_read" on storage.objects;
create policy "ficha_adjuntos_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ficha-adjuntos'
    and (storage.foldername(name))[1] = auth_org_id()::text
    and is_clinical()
  );

drop policy if exists "ficha_adjuntos_insert" on storage.objects;
create policy "ficha_adjuntos_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ficha-adjuntos'
    and (storage.foldername(name))[1] = auth_org_id()::text
    and is_clinical()
  );

drop policy if exists "ficha_adjuntos_delete" on storage.objects;
create policy "ficha_adjuntos_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'ficha-adjuntos'
    and (storage.foldername(name))[1] = auth_org_id()::text
    and is_admin()
  );