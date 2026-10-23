import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Attachment } from "@/lib/ficha/types";
import type { OrganizationType } from "@/lib/ficha/types";
import { AdjuntosPanel } from "@/app/dashboard/(panel)/pacientes/[id]/adjuntos-panel";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const ARCHIVO = "informe_radiografia_panoramica_2026_10_20_version_final.pdf";

function adjunto(partial: Partial<Attachment> = {}): Attachment {
  return {
    id: "a1",
    org_id: "org-1",
    patient_id: "pac-1",
    encounter_id: null,
    kind: "informe",
    description: null,
    taken_at: "2026-10-01",
    storage_path: "org-1/pac-1/uuid-archivo.pdf",
    file_name: ARCHIVO,
    mime: "application/pdf",
    size_bytes: 2048,
    metadata: {},
    created_by: null,
    created_at: "2026-10-19T12:00:00.000Z",
    ...partial,
  };
}

let root: Root;
let container: HTMLDivElement;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }

  fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "DELETE") {
      return { ok: true, json: async () => ({ ok: true }) };
    }
    return { ok: true, json: async () => ({ attachments: [adjunto()] }) };
  });
  vi.stubGlobal("fetch", fetchMock);

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function render(
  puedeEliminar = true,
  orgType: OrganizationType = "dental",
) {
  await act(async () => {
    root.render(
      <AdjuntosPanel
        patientId="pac-1"
        orgId="org-1"
        orgType={orgType}
        puedeEliminar={puedeEliminar}
      />,
    );
  });
}

function botonEliminar(): HTMLButtonElement | undefined {
  return [...container.querySelectorAll("button")].find(
    (b) => b.textContent === "Eliminar",
  ) as HTMLButtonElement | undefined;
}

describe("AdjuntosPanel", () => {
  it("acorta el nombre del archivo y conserva la extensión", async () => {
    await render();

    const textos = [...container.querySelectorAll("span")].map((s) => s.textContent ?? "");
    const visible = textos.find((t) => t.includes("…"));

    expect(visible).toBeDefined();
    expect(visible?.endsWith(".pdf")).toBe(true);
    expect(visible?.length).toBeLessThanOrEqual(44);
    expect(visible?.startsWith("informe_radiografia")).toBe(true);
  });

  it("ofrece eliminar solo cuando hay permiso", async () => {
    await render(false);
    expect(botonEliminar()).toBeUndefined();

    act(() => root.unmount());
    root = createRoot(container);
    await render(true);
    expect(botonEliminar()).toBeDefined();
  });

  it("muestra solo tipos compartidos y psicológicos en la ficha psicológica", async () => {
    await render(true, "psychological");

    const opciones = [...container.querySelectorAll("#kind option")].map((option) => option.textContent);
    expect(opciones).toEqual(["Documento", "Consentimiento", "Informe", "Otro"]);
    expect(container.textContent).not.toContain("Radiografía");
    expect(container.textContent).not.toContain("Foto intraoral");
    expect(container.textContent).not.toContain("Foto extraoral");
  });

  it("muestra tipos odontológicos sin exponerlos a otras especialidades", async () => {
    await render(true, "dental");
    const dentales = [...container.querySelectorAll("#kind option")].map((option) => option.textContent);
    expect(dentales).toContain("Foto intraoral");
    expect(dentales).toContain("Foto extraoral");
    expect(dentales).toContain("Radiografía");

    act(() => root.unmount());
    root = createRoot(container);
    await render(true, "medical");
    const medicos = [...container.querySelectorAll("#kind option")].map((option) => option.textContent);
    expect(medicos).toContain("Radiografía / imagenología");
    expect(medicos).not.toContain("Foto intraoral");
    expect(medicos).not.toContain("Foto extraoral");
    expect(medicos).not.toContain("Modelo");
  });

  it("confirma y elimina el adjunto", async () => {
    await render();

    act(() => {
      botonEliminar()?.click();
    });

    const dialogo = document.querySelector('[role="dialog"]');
    expect(dialogo?.textContent).toContain(ARCHIVO);

    const confirmar = [...(dialogo?.querySelectorAll("button") ?? [])].find(
      (b) => b.textContent === "Eliminar",
    );
    await act(async () => {
      (confirmar as HTMLButtonElement).click();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ficha/attachments/a1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(container.textContent).toContain("Sin adjuntos registrados.");
  });
});
