-- 20261103000000 · Ficha dental: registros sólo sobre atención propia en borrador
--
-- Regla:
--   - Odontograma, periodoncia y plan de tratamiento se asocian a una atención
--     en borrador del propio autor.
--   - Las atenciones firmadas son inmutables: no reciben registros nuevos.
--   - El plan puede seguir actualizándose después de firmar la atención
--     (estados, pagos), pero no admite nuevas filas sin borrador propio.

create or replace function public.encounter_is_open_for_author(p_encounter uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from encounters e
     where e.id = p_encounter
       and e.org_id = auth_org_id()
       and e.status = 'draft'
       and e.doctor_id = auth.uid()
  );
$$;

-- Odontograma
drop policy if exists dental_chart_clinical_insert on public.dental_chart_entries;
create policy dental_chart_clinical_insert on public.dental_chart_entries
  for insert to authenticated
  with check (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
    and encounter_is_open_for_author(encounter_id)
  );

-- Periodoncia
drop policy if exists periodontal_clinical_insert on public.periodontal_records;
create policy periodontal_clinical_insert on public.periodontal_records
  for insert to authenticated
  with check (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
    and encounter_is_open_for_author(encounter_id)
  );

-- Plan de tratamiento: alta con borrador propio; el resto del ciclo de vida
-- (estado, aprobación, edición) no depende de que la atención siga abierta.
drop policy if exists treatment_plan_clinical_all on public.dental_treatment_plan_items;

drop policy if exists treatment_plan_clinical_insert on public.dental_treatment_plan_items;
create policy treatment_plan_clinical_insert on public.dental_treatment_plan_items
  for insert to authenticated
  with check (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
    and encounter_is_open_for_author(encounter_id)
  );

drop policy if exists treatment_plan_clinical_update on public.dental_treatment_plan_items;
create policy treatment_plan_clinical_update on public.dental_treatment_plan_items
  for update to authenticated
  using (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
  )
  with check (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
  );

drop policy if exists treatment_plan_clinical_delete on public.dental_treatment_plan_items;
create policy treatment_plan_clinical_delete on public.dental_treatment_plan_items
  for delete to authenticated
  using (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
  );
