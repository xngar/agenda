import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AuditoriaPanel } from "@/app/dashboard/(panel)/pacientes/[id]/auditoria-panel";

const PACIENTE = "11111111-1111-1111-1111-111111111111";

function filas(cantidad: number) {
  return Array.from({ length: cantidad }, (_, i) => ({
    id: i + 1,
    org_id: PACIENTE,
    actor_id: null,
    action: "update" as const,
    entity: "patients",
    entity_id: PACIENTE,
    summary: {},
    created_at: "2026-10-19T12:00:00.000Z",
    actor_name: "Dra. Prueba",
    detalle: `Evento ${i + 1}`,
  }));
}

let root: Root;
let container: HTMLDivElement;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ entries: filas(20), total: 45 }),
  }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function render() {
  await act(async () => {
    root.render(<AuditoriaPanel patientId={PACIENTE} isAdmin />);
  });
}

function ultimaLlamada(): string {
  return String(fetchMock.mock.calls.at(-1)?.[0] ?? "");
}

describe("AuditoriaPanel", () => {
  it("muestra la tabla paginada con el total del servidor", async () => {
    await render();

    expect(ultimaLlamada()).toContain("limit=20");
    expect(ultimaLlamada()).toContain("offset=0");

    const filasTabla = container.querySelectorAll("table tbody tr");
    expect(filasTabla.length).toBe(20);
    expect(container.textContent).toContain("Página 1 de 3");
    expect(container.textContent).toContain("Mostrando 1–20 de 45");
  });

  it("pide la página siguiente con offset del servidor", async () => {
    await render();

    const siguiente = [...container.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Siguiente"),
    );
    if (!siguiente) throw new Error("sin botón Siguiente");

    await act(async () => {
      siguiente.click();
    });

    expect(ultimaLlamada()).toContain("offset=20");
    expect(container.textContent).toContain("Página 2 de 3");
  });

  it("vuelve a la página 1 y filtra por acción", async () => {
    await render();

    const select = container.querySelector('select[name="accion"]') as HTMLSelectElement | null;
    if (!select) throw new Error("sin selector de acción");

    await act(async () => {
      select.value = "contact";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const llamada = ultimaLlamada();
    expect(llamada).toContain("action=contact");
    expect(llamada).toContain("offset=0");
  });
});
