-- 20261103000001 · Periodoncia: corrección con reemplazo y trazabilidad
--
-- Regla:
--   - Un registro periodontal no se edita ni se elimina.
--   - La corrección crea un registro nuevo que reemplaza al anterior.
--   - Solo el autor del registro original puede corregirlo.
--   - El motivo de la corrección es obligatorio.
--   - El registro nuevo debe asociarse a una atención en borrador propia.
--   - El registro original se conserva con estado "reemplazado".

alter table public.periodontal_records
  add column if not exists status text not null default 'vigente',
  add column if not exists replaces_id uuid references public.periodontal_records(id) on delete set null,
  add column if not exists superseded_by uuid references public.periodontal_records(id) on delete set null,
  add column if not exists correction_reason text,
  add column if not exists corrected_by uuid references public.doctors(id) on delete set null,
  add column if not exists corrected_at timestamptz;

alter table public.periodontal_records
  drop constraint if exists periodontal_status_chk;
alter table public.periodontal_records
  add constraint periodontal_status_chk check (status in ('vigente', 'reemplazado'));

alter table public.periodontal_records
  drop constraint if exists periodontal_correction_reason_chk;
alter table public.periodontal_records
  add constraint periodontal_correction_reason_chk check (
    replaces_id is null
    or (correction_reason is not null and length(btrim(correction_reason)) >= 3)
  );

create unique index if not exists periodontal_replaces_uq
  on public.periodontal_records (replaces_id)
  where replaces_id is not null;

create index if not exists periodontal_patient_status_idx
  on public.periodontal_records (org_id, patient_id, status);

-- Sanea el registro nuevo: un alta normal siempre queda vigente y sin datos de
-- corrección; una corrección mantiene el motivo informado por el autor.
create or replace function public.periodontal_record_normalize()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.status := 'vigente';
  new.superseded_by := null;

  if new.replaces_id is null then
    new.correction_reason := null;
    new.corrected_by := null;
    new.corrected_at := null;
  end if;

  return new;
end;
$$;

-- Marca el registro original como reemplazado después de insertar el nuevo:
-- en un trigger AFTER la fila nueva ya existe y la FK de superseded_by es válida.
create or replace function public.periodontal_record_mark_replaced()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_author uuid;
begin
  if new.replaces_id is null then
    return new;
  end if;

  select coalesce(r.created_by, e.doctor_id)
    into v_author
    from periodontal_records r
    left join encounters e on e.id = r.encounter_id
   where r.id = new.replaces_id
     and r.org_id = new.org_id
     and r.patient_id = new.patient_id
     and r.status = 'vigente';

  if v_author is null or v_author <> auth.uid() then
    raise exception using errcode = 'EPERI', message = 'periodontal_correccion_no_autorizada';
  end if;

  update periodontal_records
     set status = 'reemplazado',
         superseded_by = new.id,
         correction_reason = new.correction_reason,
         corrected_by = auth.uid(),
         corrected_at = now()
   where id = new.replaces_id
     and status = 'vigente';

  if not found then
    raise exception using errcode = 'EPERI', message = 'periodontal_registro_ya_reemplazado';
  end if;

  return new;
end;
$$;

drop trigger if exists periodontal_before_insert on public.periodontal_records;
create trigger periodontal_before_insert
  before insert on public.periodontal_records
  for each row execute function public.periodontal_record_normalize();

drop trigger if exists periodontal_after_insert on public.periodontal_records;
create trigger periodontal_after_insert
  after insert on public.periodontal_records
  for each row execute function public.periodontal_record_mark_replaced();

-- El autor del registro se fija desde la sesión; el cliente no puede suplantarlo.
drop policy if exists periodontal_clinical_insert on public.periodontal_records;
create policy periodontal_clinical_insert on public.periodontal_records
  for insert to authenticated
  with check (
    org_id = auth_org_id()
    and is_clinical()
    and (is_admin() or is_super_admin() or patient_has_care(patient_id))
    and encounter_is_open_for_author(encounter_id)
    and created_by = auth.uid()
  );
