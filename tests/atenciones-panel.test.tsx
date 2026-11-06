import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Encounter } from "@/lib/ficha/types";
import { AtencionesPanel } from "@/app/dashboard/(panel)/pacientes/[id]/atenciones-panel";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const BORRADOR: Encounter = {
  id: "enc-1",
  org_id: "org-1",
  patient_id: "pac-1",
  doctor_id: "doc-1",
  appointment_id: null,
  started_at: "2026-11-03T12:00:00.000Z",
  care_type: "control",
  motivo: "Control de caries",
  evolucion: "Sin cambios",
  diagnostico: "Caries estable",
  indicaciones: "Control en seis meses",
  proxima_cita_at: null,
  specialty_data: {},
  status: "draft",
  signed_by: null,
  signed_at: null,
  created_at: "2026-11-03T12:00:00.000Z",
  updated_at: "2026-11-03T12:00:00.000Z",
};

let fetchMock: ReturnType<typeof vi.fn>;

function json(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

beforeEach(() => {
  fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.endsWith("/encounters") && method === "GET") {
      return json({ encounters: [{ ...BORRADOR, doctors: { full_name: "Dra. Prueba" } }] });
    }
    if (url.endsWith("/encounters/enc-1") && method === "POST") {
      return json({ encounter: { ...BORRADOR, status: "signed" } });
    }
    return json({});
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AtencionesPanel", () => {
  it("pide confirmación antes de firmar y no firma hasta confirmar", async () => {
    render(<AtencionesPanel patientId="pac-1" orgType="dental" />);

    fireEvent.click(await screen.findByRole("button", { name: "Firmar" }));

    expect(await screen.findByText(/Qué cambia al firmar/i)).toBeDefined();
    expect(screen.getByText(/seguirán editables/i)).toBeDefined();

    const firmarPost = () =>
      fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).endsWith("/encounters/enc-1") &&
          (init as RequestInit | undefined)?.method === "POST",
      );
    expect(firmarPost()).toBeUndefined();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar firma" }));

    await waitFor(() => expect(firmarPost()).toBeDefined());
  });
});
