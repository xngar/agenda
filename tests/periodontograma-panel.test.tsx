import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PeriodontogramaPanel } from "@/app/dashboard/(panel)/pacientes/[id]/periodontograma-panel";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const BORRADOR = {
  id: "enc-1",
  started_at: "2026-11-03",
  care_type: "control",
  doctors: { full_name: "Dra. Prueba" },
};

const VIGENTE = {
  id: "per-1",
  org_id: "org-1",
  patient_id: "pac-1",
  encounter_id: "enc-1",
  tooth: 11,
  depths: { mv: [3], v: [2], dv: [1] },
  bleeding_on_probing: true,
  recession: 1,
  mobility: 1,
  furcation: null,
  diagnosis: "Sondaje inicial",
  recorded_at: "2026-10-01",
  created_by: "doc-1",
  created_at: "2026-10-01T12:00:00.000Z",
  status: "vigente",
  replaces_id: null,
  superseded_by: null,
  correction_reason: null,
  corrected_by: null,
  corrected_at: null,
  author_id: "doc-1",
  can_correct: true,
};

const REEMPLAZADO = {
  ...VIGENTE,
  id: "per-0",
  status: "reemplazado",
  superseded_by: "per-1",
  correction_reason: "Profundidad mal digitada",
  corrected_at: "2026-11-02T12:00:00.000Z",
  can_correct: false,
};

let fetchMock: ReturnType<typeof vi.fn>;

function json(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

beforeEach(() => {
  fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.endsWith("/encounters?status=draft&mine=1")) {
      return json({ encounters: [BORRADOR] });
    }
    if (url.endsWith("/periodontal") && method === "POST") {
      return json({ record: VIGENTE }, true);
    }
    if (url.endsWith("/periodontal")) {
      return json({ records: [VIGENTE, REEMPLAZADO] });
    }
    return json({});
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function postPeriodontal() {
  return fetchMock.mock.calls.find(
    ([url, init]) =>
      String(url).endsWith("/periodontal") &&
      (init as RequestInit | undefined)?.method === "POST",
  );
}

describe("PeriodontogramaPanel", () => {
  it("muestra todos los registros con su estado y solo ofrece corregir el vigente propio", async () => {
    render(<PeriodontogramaPanel patientId="pac-1" />);

    expect(await screen.findByText("Vigente")).toBeDefined();
    expect(screen.getByText("Reemplazado")).toBeDefined();
    expect(screen.getByText(/Profundidad mal digitada/)).toBeDefined();
    expect(screen.getAllByRole("button", { name: "Corregir" })).toHaveLength(1);
    expect(screen.getByText("—")).toBeDefined();
  });

  it("precarga el registro, exige motivo y envía la corrección con replaces_id", async () => {
    render(<PeriodontogramaPanel patientId="pac-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Corregir" }));

    expect(screen.getByText(/Corrigiendo el registro/)).toBeDefined();
    const pieza = screen.getByLabelText(/Pieza \(FDI\)/) as HTMLSelectElement;
    expect(pieza.value).toBe("11");
    const movilidad = screen.getByLabelText(/Movilidad \(0–3\)/) as HTMLSelectElement;
    expect(movilidad.value).toBe("1");

    fireEvent.click(screen.getByRole("button", { name: "Guardar corrección" }));
    expect(await screen.findByText(/Indica el motivo de la corrección/)).toBeDefined();
    expect(postPeriodontal()).toBeUndefined();

    fireEvent.change(screen.getByLabelText(/Motivo de la corrección/), {
      target: { value: "Corrijo la profundidad distal" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar corrección" }));

    await waitFor(() => expect(postPeriodontal()).toBeDefined());

    const body = JSON.parse(String((postPeriodontal()?.[1] as RequestInit).body));
    expect(body.encounter_id).toBe("enc-1");
    expect(body.replaces_id).toBe("per-1");
    expect(body.correction_reason).toBe("Corrijo la profundidad distal");
    expect(body.depths).toEqual({ mv: [3], v: [2], dv: [1] });
  });
});
