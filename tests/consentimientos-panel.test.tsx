import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Attachment } from "@/lib/ficha/types";
import { ConsentimientosPanel } from "@/app/dashboard/(panel)/pacientes/[id]/consentimientos-panel";

const { uploadMock, removeMock } = vi.hoisted(() => ({
  uploadMock: vi.fn(),
  removeMock: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/lib/supabase/browser", () => ({
  supabaseBrowser: () => ({
    storage: {
      from: () => ({ upload: uploadMock, remove: removeMock }),
    },
  }),
}));

const ADJUNTO: Attachment = {
  id: "att-consent",
  org_id: "org-1",
  patient_id: "pac-1",
  encounter_id: null,
  kind: "consentimiento",
  description: null,
  taken_at: null,
  storage_path: "org-1/pac-1/uuid-consentimiento.pdf",
  file_name: "consentimiento.pdf",
  mime: "application/pdf",
  size_bytes: 2048,
  metadata: {},
  created_by: null,
  created_at: "2026-11-02T12:00:00.000Z",
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  uploadMock.mockReset();
  uploadMock.mockResolvedValue({ error: null });
  removeMock.mockReset();
  removeMock.mockResolvedValue({ error: null });

  fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/consents") && method === "GET") {
      return { ok: true, json: async () => ({ consents: [] }) };
    }
    if (url.endsWith("/attachments") && method === "POST") {
      return { ok: true, json: async () => ({ attachment: ADJUNTO }) };
    }
    if (url.endsWith("/attachments") && method === "GET") {
      return { ok: true, json: async () => ({ attachments: [] }) };
    }
    if (url.endsWith("/encounters")) {
      return { ok: true, json: async () => ({ encounters: [] }) };
    }
    return { ok: true, json: async () => ({}) };
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ConsentimientosPanel", () => {
  it("permite subir y vincular el documento firmado sin salir de la pestaña", async () => {
    render(
      <ConsentimientosPanel patientId="pac-1" orgId="org-1" orgType="dental" />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Registrar consentimiento" }),
    );

    fireEvent.change(screen.getByLabelText(/Forma de aceptación/i), {
      target: { value: "documento" },
    });

    const input = screen.getByLabelText(/Subir un documento nuevo/i) as HTMLInputElement;
    const file = new File(["%PDF-1.4"], "consentimiento.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: "Subir y vincular documento" }));

    await waitFor(() => expect(uploadMock).toHaveBeenCalledTimes(1));

    const postCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith("/attachments") &&
        (init as RequestInit | undefined)?.method === "POST",
    );
    expect(postCall).toBeDefined();
    expect(JSON.parse(String((postCall?.[1] as RequestInit).body))).toMatchObject({
      patient_id: "pac-1",
      kind: "consentimiento",
      file_name: "consentimiento.pdf",
    });

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/Documentos de consentimiento ya cargados/i) as HTMLSelectElement)
          .value,
      ).toBe(ADJUNTO.id);
    });
    expect(screen.queryByText(/Falta subir o seleccionar/i)).toBeNull();
  });

  it("avisa cuando hay adjuntos que no son de tipo consentimiento", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/consents")) {
        return { ok: true, json: async () => ({ consents: [] }) };
      }
      if (url.endsWith("/attachments")) {
        return {
          ok: true,
          json: async () => ({
            attachments: [{ ...ADJUNTO, id: "doc-1", kind: "document", file_name: "informe.pdf" }],
          }),
        };
      }
      if (url.endsWith("/encounters")) {
        return { ok: true, json: async () => ({ encounters: [] }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    render(
      <ConsentimientosPanel patientId="pac-1" orgId="org-1" orgType="dental" />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Registrar consentimiento" }),
    );

    expect(
      await screen.findByText(/que no son de tipo «Consentimiento» y no se pueden vincular/i),
    ).toBeDefined();
  });
});
