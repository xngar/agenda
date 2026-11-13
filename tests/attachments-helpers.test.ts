import { describe, expect, it } from "vitest";
import {
  ATTACHMENT_MAX_BYTES,
  attachmentFileError,
  resolveAttachmentMime,
} from "@/lib/ficha/attachments";

function archivo(name: string, size = 1024, type = ""): Pick<File, "name" | "size" | "type"> {
  return { name, size, type };
}

describe("attachmentFileError", () => {
  it("acepta PDF, JPEG, PNG y WebP", () => {
    expect(attachmentFileError(archivo("consentimiento.pdf", 1024, "application/pdf"))).toBeNull();
    expect(attachmentFileError(archivo("foto.jpg", 1024, "image/jpeg"))).toBeNull();
    expect(attachmentFileError(archivo("foto.png", 1024, "image/png"))).toBeNull();
    expect(attachmentFileError(archivo("foto.webp", 1024, "image/webp"))).toBeNull();
  });

  it("deduce el MIME desde la extensión cuando el navegador no lo informa", () => {
    expect(attachmentFileError(archivo("consentimiento.pdf"))).toBeNull();
    expect(resolveAttachmentMime("consentimiento.PDF")).toBe("application/pdf");
  });

  it("rechaza archivos sobre el límite de 20 MiB", () => {
    expect(
      attachmentFileError(archivo("grande.pdf", ATTACHMENT_MAX_BYTES + 1, "application/pdf")),
    ).toBe("El archivo supera el límite de 20 MiB");
  });

  it("rechaza extensiones no permitidas", () => {
    expect(attachmentFileError(archivo("script.exe", 1024, "application/x-msdownload"))).toBe(
      "Solo se permiten archivos PDF, JPEG, PNG o WebP",
    );
  });

  it("rechaza un tipo declarado distinto a la extensión permitida", () => {
    expect(attachmentFileError(archivo("consentimiento.pdf", 1024, "text/html"))).toBe(
      "Solo se permiten archivos PDF, JPEG, PNG o WebP",
    );
  });
});

describe("resolveAttachmentMime", () => {
  it("prefiere el tipo declarado válido", () => {
    expect(resolveAttachmentMime("archivo.bin", "image/png")).toBe("image/png");
  });

  it("devuelve null para formatos desconocidos", () => {
    expect(resolveAttachmentMime("archivo.txt", "text/plain")).toBeNull();
  });
});
