import type { AttachmentKind, OrganizationType } from "./types";

export interface AttachmentKindOption {
  value: AttachmentKind;
  label: string;
}

const COMMON_ATTACHMENT_KINDS: AttachmentKindOption[] = [
  { value: "document", label: "Documento" },
  { value: "consentimiento", label: "Consentimiento" },
  { value: "informe", label: "Informe" },
  { value: "other", label: "Otro" },
];

const DENTAL_ATTACHMENT_KINDS: AttachmentKindOption[] = [
  { value: "radiografia", label: "Radiografía" },
  { value: "foto_intraoral", label: "Foto intraoral" },
  { value: "foto_extraoral", label: "Foto extraoral" },
  { value: "modelo", label: "Modelo" },
];

const MEDICAL_ATTACHMENT_KINDS: AttachmentKindOption[] = [
  { value: "radiografia", label: "Radiografía / imagenología" },
];

const ATTACHMENT_KIND_OPTIONS: Record<AttachmentKind, string> = {
  document: "Documento",
  radiografia: "Radiografía",
  foto_intraoral: "Foto intraoral",
  foto_extraoral: "Foto extraoral",
  modelo: "Modelo",
  consentimiento: "Consentimiento",
  informe: "Informe",
  other: "Otro",
};

export function attachmentKindsForOrganization(
  type: OrganizationType,
): AttachmentKindOption[] {
  const specialtyKinds =
    type === "dental"
      ? DENTAL_ATTACHMENT_KINDS
      : type === "medical"
        ? MEDICAL_ATTACHMENT_KINDS
        : [];
  return [...COMMON_ATTACHMENT_KINDS, ...specialtyKinds];
}

export function isAttachmentKindAllowed(
  type: OrganizationType,
  kind: AttachmentKind,
): boolean {
  return attachmentKindsForOrganization(type).some((option) => option.value === kind);
}

export function attachmentKindLabel(kind: AttachmentKind): string {
  return ATTACHMENT_KIND_OPTIONS[kind];
}
