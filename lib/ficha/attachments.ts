import type { AttachmentKind, OrganizationType } from "./types";

export interface AttachmentKindOption {
  value: AttachmentKind;
  label: string;
}

export const ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;

const ATTACHMENT_MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const ALLOWED_ATTACHMENT_MIMES = Object.values(ATTACHMENT_MIME_BY_EXTENSION);

export function resolveAttachmentMime(fileName: string, declaredType?: string | null): string | null {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const mime = (declaredType || ATTACHMENT_MIME_BY_EXTENSION[extension] || "").toLowerCase();
  return ALLOWED_ATTACHMENT_MIMES.includes(mime) ? mime : null;
}

export function attachmentFileError(file: Pick<File, "name" | "size" | "type">): string | null {
  if (file.size > ATTACHMENT_MAX_BYTES) {
    return "El archivo supera el límite de 20 MiB";
  }
  if (!resolveAttachmentMime(file.name, file.type)) {
    return "Solo se permiten archivos PDF, JPEG, PNG o WebP";
  }
  return null;
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
