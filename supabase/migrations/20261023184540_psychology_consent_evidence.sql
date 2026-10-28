alter table public.consents
  add column acceptance_channel text,
  add column evidence_attachment_id uuid
    constraint consents_evidence_attachment_id_fkey
    references public.attachments(id)
    on delete set null;

alter table public.consents
  add constraint consents_acceptance_channel_check
    check (
      acceptance_channel is null
      or acceptance_channel in (
        'presencial',
        'videollamada',
        'llamada_telefonica',
        'correo_electronico',
        'plataforma_digital'
      )
    ) not valid,
  add constraint consents_document_requires_attachment_check
    check (acceptance_method <> 'documento' or evidence_attachment_id is not null) not valid,
  add constraint consents_acceptance_channel_required_check
    check (
      acceptance_method not in ('verbal', 'documento')
      or acceptance_channel is not null
    ) not valid;

create index consents_evidence_attachment_idx
  on public.consents (evidence_attachment_id)
  where evidence_attachment_id is not null;
