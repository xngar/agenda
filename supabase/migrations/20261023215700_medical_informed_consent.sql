alter table public.consents
  drop constraint if exists consents_kind_check;

alter table public.consents
  add constraint consents_kind_check
    check (kind in (
      'datos_personales',
      'tratamiento_dental',
      'psicoterapia',
      'atencion_online',
      'medical_procedure',
      'medical_treatment',
      'medical_anesthesia',
      'other'
    )),
  add column outcome text not null default 'accepted'
    check (outcome in ('accepted', 'rejected'));
