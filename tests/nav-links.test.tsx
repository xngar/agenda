import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NavLinks } from "@/app/dashboard/nav-links";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/pacientes",
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
}));

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
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.querySelectorAll("[data-radix-portal]").forEach((el) => el.remove());
});

function enlaces(): HTMLAnchorElement[] {
  return [...container.querySelectorAll("nav a")] as HTMLAnchorElement[];
}

function triggerDisponibilidad(): HTMLButtonElement {
  const botones = [...container.querySelectorAll("nav button")];
  const trigger = botones.find((b) => b.textContent?.includes("Disponibilidad"));
  if (!trigger) throw new Error("sin botón Disponibilidad");
  return trigger as HTMLButtonElement;
}

function abrirMenu() {
  const trigger = triggerDisponibilidad();
  act(() => {
    // Radix abre el dropdown en pointerdown, no en click.
    trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  });
}

function itemsMenu(): string[] {
  return [...document.querySelectorAll('[role="menuitem"]')].map(
    (el) => el.textContent?.trim() ?? "",
  );
}

describe("NavLinks", () => {
  it("cada enlace lleva icono y texto, y el activo se marca", () => {
    act(() => {
      root.render(<NavLinks isAdmin={false} />);
    });

    const links = enlaces();
    expect(links).toHaveLength(3);
    for (const a of links) {
      expect(a.querySelector("svg")).not.toBeNull();
      expect(a.textContent?.trim().length).toBeGreaterThan(0);
    }

    const pacientes = links.find((a) => a.getAttribute("href") === "/dashboard/pacientes");
    expect(pacientes?.getAttribute("aria-current")).toBe("page");
    const agenda = links.find((a) => a.getAttribute("href") === "/dashboard");
    expect(agenda?.getAttribute("aria-current")).toBeNull();
  });

  it("el admin ve Equipo y Servicios con icono", () => {
    act(() => {
      root.render(<NavLinks isAdmin={true} />);
    });
    const links = enlaces();
    expect(links).toHaveLength(5);
    expect(container.textContent).toContain("Servicios");
    expect(triggerDisponibilidad().textContent).toContain("Disponibilidad");
  });

  it("el dropdown muestra Horario y Bloqueos al equipo sin admin", () => {
    act(() => {
      root.render(<NavLinks isAdmin={false} />);
    });
    abrirMenu();
    expect(itemsMenu()).toEqual(["Horario", "Bloqueos"]);
  });

  it("el dropdown suma Feriados para el admin", () => {
    act(() => {
      root.render(<NavLinks isAdmin={true} />);
    });
    abrirMenu();
    expect(itemsMenu()).toEqual(["Horario", "Bloqueos", "Feriados"]);
  });
});
