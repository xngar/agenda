import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OdontogramaPanel } from "@/app/dashboard/(panel)/pacientes/[id]/odontograma-panel";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let fetchMock: ReturnType<typeof vi.fn>;

function json(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

const BORRADOR = {
  id: "enc-1",
  started_at: "2026-11-03",
  care_type: "control",
  doctors: { full_name: "Dra. Prueba" },
};

beforeEach(() => {
  fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.endsWith("/encounters?status=draft&mine=1")) {
      return json({ encounters: [] });
    }
    if (url.endsWith("/encounters") && method === "POST") {
      return json({ encounter: BORRADOR });
    }
    if (url.includes("/chart?tooth=")) {
      return json({ chart: [] });
    }
    if (url.endsWith("/chart")) {
      return json({ chart: [] });
    }
    return json({});
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("OdontogramaPanel", () => {
  it("pide solo los borradores propios y permite crear uno desde el odontograma", async () => {
    render(<OdontogramaPanel patientId="pac-1" />);

    expect(await screen.findByText(/no tiene atenciones en borrador/i)).toBeDefined();
    expect(
      fetchMock.mock.calls.some(
        ([url]) =>
          String(url) === "/api/ficha/patients/pac-1/encounters?status=draft&mine=1",
      ),
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Crear atención en borrador" }));

    await waitFor(() => {
      const llamada = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).endsWith("/encounters") &&
          (init as RequestInit | undefined)?.method === "POST",
      );
      expect(llamada).toBeDefined();
    });

    expect(await screen.findByText(/Los cambios se asociarán/i)).toBeDefined();
  });

  it("autoselecciona la única atención en borrador al abrir una pieza", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/encounters?status=draft&mine=1")) {
        return json({ encounters: [BORRADOR] });
      }
      if (url.includes("/chart?tooth=")) {
        return json({ chart: [] });
      }
      if (url.endsWith("/chart")) {
        return json({ chart: [] });
      }
      return json({}, method !== "POST");
    });

    render(<OdontogramaPanel patientId="pac-1" />);

    fireEvent.click(await screen.findByRole("button", { name: /Pieza 11/ }));

    const selector = (await screen.findByLabelText(
      /Atención en borrador/i,
    )) as HTMLSelectElement;
    expect(selector.value).toBe(BORRADOR.id);
  });
});
