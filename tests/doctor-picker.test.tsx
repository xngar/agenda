import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { DoctorPicker } from "@/app/dashboard/(panel)/doctor-picker";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(""),
}));

const DOCTORES = [
  { id: "1", full_name: "Camila Rojas", specialty: null },
  { id: "2", full_name: "Sebastián Muñoz", specialty: null },
];

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  // cmdk los usa para la lista; jsdom no los trae.
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
  push.mockClear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.querySelectorAll("[data-radix-portal]").forEach((el) => el.remove());
});

function trigger(): HTMLButtonElement {
  const b = container.querySelector("#filtro-doctor");
  if (!b) throw new Error("sin botón");
  return b as HTMLButtonElement;
}

function escribir(input: HTMLInputElement, texto: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, texto);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  // cmdk escucha "input"; por si acaso también se dispara change.
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("DoctorPicker (shadcn)", () => {
  it("muestra el profesional actual y conserva el id", () => {
    act(() => {
      root.render(
        <DoctorPicker current={null} canFilter doctors={DOCTORES} />,
      );
    });
    expect(trigger().textContent).toContain("Todo el equipo");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("filtra y navega con ?doctor= al elegir", async () => {
    act(() => {
      root.render(
        <DoctorPicker current={null} canFilter doctors={DOCTORES} />,
      );
    });
    act(() => {
      trigger().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const input = document.querySelector('[role="combobox"] ~ *, input[placeholder*="Buscar"]') as HTMLInputElement | null
      ?? (document.querySelector('input[placeholder="Buscar profesional…"]') as HTMLInputElement | null);
    expect(input).not.toBeNull();

    await act(async () => {
      escribir(input!, "sebastian");
    });

    const opciones = [...document.querySelectorAll('[role="option"]')].filter(
      (el) => (el as HTMLElement).dataset.disabled !== "true" && el.textContent?.includes("Sebastián"),
    );
    expect(opciones.length).toBeGreaterThan(0);

    await act(async () => {
      (opciones[0] as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(push).toHaveBeenCalledWith("/dashboard?doctor=2");
  });

  it("sin permiso no renderiza nada", () => {
    act(() => {
      root.render(
        <DoctorPicker current={null} canFilter={false} doctors={DOCTORES} />,
      );
    });
    expect(container.querySelector("#filtro-doctor")).toBeNull();
  });

  it("Todo el equipo navega con doctor=all", async () => {
    act(() => {
      root.render(
        <DoctorPicker current={null} canFilter doctors={DOCTORES} />,
      );
    });
    act(() => {
      trigger().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const todas = [...document.querySelectorAll('[role="option"]')].filter(
      (el) => (el as HTMLElement).dataset.disabled !== "true" && el.textContent?.includes("Todo el equipo"),
    );
    expect(todas.length).toBeGreaterThan(0);

    await act(async () => {
      (todas[0] as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(push).toHaveBeenCalledWith("/dashboard?doctor=all");
  });
});
