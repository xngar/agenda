import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { OrganizationList, type OrganizationRow } from "@/app/dashboard/(platform)/plataforma/organizaciones/org-list";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
}));

const ORG: OrganizationRow = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Clínica Prueba",
  slug: "clinica-prueba",
  type: "dental",
  active: true,
  createdAt: "13 oct 2026",
  admin: { id: "00000000-0000-0000-0000-000000000002", name: "Admin", email: "admin@test.cl" },
  professionals: 1,
  professionalLimit: 2,
};

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  if (typeof Element.prototype.scrollIntoView !== "function") {
    Element.prototype.scrollIntoView = () => {};
  }
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
  refresh.mockClear();
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({}) })));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.querySelectorAll("[data-radix-portal]").forEach((el) => el.remove());
  vi.unstubAllGlobals();
});

function trigger(): HTMLButtonElement {
  const b = container.querySelector("[data-professional-limit]");
  if (!b) throw new Error("sin trigger de cupo");
  return b as HTMLButtonElement;
}

describe("CupoCombobox", () => {
  it("muestra el cupo actual y conserva data-professional-limit", () => {
    act(() => {
      root.render(<OrganizationList organizations={[ORG]} />);
    });
    expect(trigger().textContent).toContain("2");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("elige Sin límite y guarda null", async () => {
    await act(async () => {
      root.render(<OrganizationList organizations={[ORG]} />);
    });
    await act(async () => {
      trigger().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const opciones = [...document.querySelectorAll('[role="option"]')];
    const sinLimite = opciones.find((el) => el.textContent?.includes("Sin límite"));
    expect(sinLimite).toBeTruthy();

    await act(async () => {
      (sinLimite as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const llamado = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(llamado[0]).toBe("/api/platform/organizations");
    expect(JSON.parse(llamado[1].body)).toEqual({ id: ORG.id, professionalLimit: null });
  });
});
