-- 20261030120000 · Ficha clínica: permisos por relación con la atención
--
-- Modelo:
--   - `patients.doctor_id` es el profesional tratante principal, no el dueño
--     de la ficha (la ficha pertenece al prestador).
--   - El equipo clínico sólo accede a pacientes con vínculo asistencial:
--     tratante principal, cita propia o atención propia.
--   - Cada atención la edita y firma únicamente su autor mientras sea borrador.
--     Las firmadas son inmutables y se corrigen con versiones/addendum.
--   - La recepción sólo administra identificación y contacto.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.patient_has_care(p_patient uuid)
returns boolean
language sql stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from patients p
     where p.id = p_patient
       and p.org_id = auth_org_id()
       and (
         p.doctor_id = auth.uid()
         or exists (
           select 1 from appointments a
            where a.patient_id = p.id
              and a.doctor_id = auth.uid()
         )
         or exists (
           select 1 from encounters e
            where e.patient_id = p.id
              and e.doctor_id = auth.uid()
         )
       )
  );
$$;

grant execute on function public.patient_has_care(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- patients: lectura clínica sólo con vínculo; recepción mantiene contacto.
-- ---------------------------------------------------------------------------
drop policy if exists patients_clinical_read on public.patients;
create policy patients_clinical_read on public.patients
  for select to authenticated
  using (
    org_id = auth_org_id()
    and (
      staff_role() = 'reception'
      or (
        is_clinical()
        and (is_admin() or is_super_admin() or patient_has_care(id))
      )
    )
  );

drop policy if exists patients_clinical_update on public.patients;
create policy patients_clinical_update on public.patients
  for update to authenticated
  using (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(id))
  )
  with check (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(id))
  );

-- ---------------------------------------------------------------------------
-- Tablas clínicas: lectura y escritura sólo con vínculo asistencial.
-- ---------------------------------------------------------------------------
drop policy if exists background_clinical_read on public.patient_medical_background;
create policy background_clinical_read on public.patient_medical_background
  for select to authenticated
  using (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
  );

drop policy if exists background_clinical_manage on public.patient_medical_background;
create policy background_clinical_manage on public.patient_medical_background
  for all to authenticated
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

drop policy if exists encounters_clinical_read on public.encounters;
create policy encounters_clinical_read on public.encounters
  for select to authenticated
  using (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
  );

drop policy if exists encounters_clinical_insert on public.encounters;
create policy encounters_clinical_insert on public.encounters
  for insert to authenticated
  with check (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
    and doctor_id = auth.uid()
  );

drop policy if exists encounters_draft_update on public.encounters;
create policy encounters_draft_update on public.encounters
  for update to authenticated
  using (
    org_id = auth_org_id()
    and is_clinical()
    and status = 'draft'
    and doctor_id = auth.uid()
  )
  with check (
    org_id = auth_org_id()
    and is_clinical()
    and doctor_id = auth.uid()
  );

drop policy if exists encounters_draft_delete on public.encounters;
create policy encounters_draft_delete on public.encounters
  for delete to authenticated
  using (
    org_id = auth_org_id()
    and status = 'draft'
    and doctor_id = auth.uid()
  );

drop policy if exists versions_clinical_read on public.encounter_versions;
create policy versions_clinical_read on public.encounter_versions
  for select to authenticated
  using (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
  );

drop policy if exists versions_clinical_insert on public.encounter_versions;
create policy versions_clinical_insert on public.encounter_versions
  for insert to authenticated
  with check (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
  );

drop policy if exists attachments_clinical_read on public.attachments;
create policy attachments_clinical_read on public.attachments
  for select to authenticated
  using (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
  );

drop policy if exists attachments_clinical_insert on public.attachments;
create policy attachments_clinical_insert on public.attachments
  for insert to authenticated
  with check (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
  );

drop policy if exists consents_clinical_read on public.consents;
create policy consents_clinical_read on public.consents
  for select to authenticated
  using (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
  );

drop policy if exists consents_clinical_insert on public.consents;
create policy consents_clinical_insert on public.consents
  for insert to authenticated
  with check (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
  );

drop policy if exists prescriptions_clinical_read on public.prescriptions;
create policy prescriptions_clinical_read on public.prescriptions
  for select to authenticated
  using (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
  );

drop policy if exists prescriptions_clinical_insert on public.prescriptions;
create policy prescriptions_clinical_insert on public.prescriptions
  for insert to authenticated
  with check (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
  );

drop policy if exists dental_chart_clinical_read on public.dental_chart_entries;
create policy dental_chart_clinical_read on public.dental_chart_entries
  for select to authenticated
  using (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
  );

drop policy if exists dental_chart_clinical_insert on public.dental_chart_entries;
create policy dental_chart_clinical_insert on public.dental_chart_entries
  for insert to authenticated
  with check (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
  );

drop policy if exists periodontal_clinical_read on public.periodontal_records;
create policy periodontal_clinical_read on public.periodontal_records
  for select to authenticated
  using (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
  );

drop policy if exists periodontal_clinical_insert on public.periodontal_records;
create policy periodontal_clinical_insert on public.periodontal_records
  for insert to authenticated
  with check (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
  );

drop policy if exists treatment_plan_clinical_read on public.dental_treatment_plan_items;
create policy treatment_plan_clinical_read on public.dental_treatment_plan_items
  for select to authenticated
  using (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
  );

drop policy if exists treatment_plan_clinical_all on public.dental_treatment_plan_items;
create policy treatment_plan_clinical_all on public.dental_treatment_plan_items
  for all to authenticated
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

-- ---------------------------------------------------------------------------
-- El profesional tratante principal sólo lo cambia la administración.
-- La asignación inicial (doctor_id null) se permite para no romper reservas.
-- ---------------------------------------------------------------------------
create or replace function public.patients_guard_principal()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.doctor_id is not null
     and new.doctor_id is distinct from old.doctor_id
     and not (is_admin() or is_super_admin()) then
    raise exception using errcode = '42501', message = 'solo_admin_cambia_tratante';
  end if;
  return new;
end;
$$;

drop trigger if exists patients_guard_principal on public.patients;
create trigger patients_guard_principal
  before update on public.patients
  for each row execute function public.patients_guard_principal();

-- ---------------------------------------------------------------------------
-- Recepción: actualización acotada a identificación y contacto.
-- La función es definer para poder escribir sin abrir UPDATE de tabla a
-- recepción, y valida una lista blanca de columnas administrativas.
-- ---------------------------------------------------------------------------
create or replace function public.update_patient_admin(
  p_patient_id uuid,
  p_patch jsonb
)
returns public.patients
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid := auth_org_id();
  v_patient public.patients;
  v_key text;
  v_assignment text;
  v_assignments text;
  v_allowed text[] := array[
    'nombres', 'apellido_paterno', 'apellido_materno', 'full_name',
    'rut', 'birth_date', 'sex', 'nationality', 'marital_status', 'occupation',
    'address', 'comuna', 'region', 'prevision_type', 'fonasa_tramo',
    'isapre_name', 'isapre_plan', 'emergency_name', 'emergency_relation',
    'emergency_phone', 'tutor_name', 'tutor_rut', 'tutor_relation',
    'tutor_phone', 'referral_source', 'phone', 'email'
  ];
begin
  if not (is_clinical() or staff_role() = 'reception') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  if v_org is null and is_super_admin() then
    select org_id into v_org from patients where id = p_patient_id;
  end if;

  if v_org is null or not exists (
    select 1 from patients where id = p_patient_id and org_id = v_org
  ) then
    raise exception using errcode = '42501', message = 'patient_not_found';
  end if;

  for v_key in select jsonb_object_keys(p_patch)
  loop
    if not (v_key = any(v_allowed)) then
      raise exception using errcode = '22023', message = 'campo_no_permitido';
    end if;
    v_assignment := format(
      '%I = ($1->>%L)%s',
      v_key,
      v_key,
      case when v_key in ('birth_date') then '::date' else '' end
    );
    v_assignments := concat_ws(', ', v_assignments, v_assignment);
  end loop;

  if v_assignments is null then
    select * into v_patient from patients where id = p_patient_id;
    return v_patient;
  end if;

  execute format(
    'update public.patients set %s where id = $2 and org_id = $3 returning *',
    v_assignments
  )
  into v_patient
  using p_patch, p_patient_id, v_org;

  return v_patient;
end;
$$;

revoke all on function public.update_patient_admin(uuid, jsonb) from public, anon;
grant execute on function public.update_patient_admin(uuid, jsonb) to authenticated;
