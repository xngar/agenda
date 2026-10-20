-- 20261020000001 · Adjuntos: eliminar como admin o médico dueño
--
-- La política anterior sólo permitía al administrador. Se amplía al médico
-- dueño del paciente, tanto en la tabla como en el bucket privado. El grant
-- explícito mantiene el privilegio aunque cambien los default privileges.
-- El trigger attachments_audit deja el evento en audit_log.

grant delete on public.attachments to authenticated;

drop policy if exists attachments_admin_delete on attachments;
drop policy if exists attachments_clinical_delete on attachments;
create policy attachments_clinical_delete on attachments
  for delete to authenticated
  using (
    org_id = auth_org_id()
    and (
      is_admin()
      or (
        is_clinical()
        and exists (
          select 1
          from patients p
          where p.id = attachments.patient_id
            and p.org_id = auth_org_id()
            and p.doctor_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "ficha_adjuntos_delete" on storage.objects;
create policy "ficha_adjuntos_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'ficha-adjuntos'
    and (storage.foldername(name))[1] = auth_org_id()::text
    and (
      is_admin()
      or (
        is_clinical()
        and exists (
          select 1
          from public.patients p
          where p.id::text = (storage.foldername(name))[2]
            and p.org_id = auth_org_id()
            and p.doctor_id = auth.uid()
        )
      )
    )
  );
