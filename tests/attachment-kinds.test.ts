import { describe, expect, it } from "vitest";
import {
  attachmentKindsForOrganization,
  isAttachmentKindAllowed,
} from "@/lib/ficha/attachments";

describe("tipos de adjunto por organización", () => {
  it("deja solo categorías comunes en psicología", () => {
    expect(attachmentKindsForOrganization("psychological").map((kind) => kind.value)).toEqual([
      "document",
      "consentimiento",
      "informe",
      "other",
    ]);
    expect(isAttachmentKindAllowed("psychological", "foto_intraoral")).toBe(false);
    expect(isAttachmentKindAllowed("psychological", "radiografia")).toBe(false);
  });

  it("reserva fotografías y modelos para odontología", () => {
    expect(isAttachmentKindAllowed("dental", "foto_intraoral")).toBe(true);
    expect(isAttachmentKindAllowed("dental", "foto_extraoral")).toBe(true);
    expect(isAttachmentKindAllowed("dental", "modelo")).toBe(true);
    expect(isAttachmentKindAllowed("medical", "foto_extraoral")).toBe(false);
  });

  it("permite imágenes radiológicas en medicina y odontología", () => {
    expect(isAttachmentKindAllowed("medical", "radiografia")).toBe(true);
    expect(isAttachmentKindAllowed("dental", "radiografia")).toBe(true);
  });
});
