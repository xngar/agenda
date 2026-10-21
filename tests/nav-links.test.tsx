import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/pacientes",
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
}));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function enlaces(): HTMLAnchorElement[] {
  return [...container.querySelectorAll("nav a")] as HTMLAnchorElement[];
}

function botonDisponibilidad(): HTMLButtonElement {
  const boton = container.querySelector("nav button");
  if (!boton) throw new Error("sin botón Disponibilidad");
  return boton as HTMLButtonElement;
}

function abrirDisponibilidad() {
  act(() => {
    botonDisponibilidad().click();
  });
}

function etiquetasSubmenu(): string[] {
  return [...container.querySelectorAll("nav ul ul a")].map(
    (el) => el.textContent?.trim() ?? "",
  );
}

describe("SidebarNav", () => {
  it("cada enlace lleva icono y texto, y el activo se marca", () => {
    act(() => {
      root.render(<SidebarNav isAdmin={false} />);
    });

    const links = enlaces();
    expect(links).toHaveLength(2);
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
      root.render(<SidebarNav isAdmin={true} />);
    });

    const links = enlaces();
    expect(links).toHaveLength(4);
    expect(container.textContent).toContain("Servicios");
    expect(botonDisponibilidad().textContent).toContain("Disponibilidad");
  });

  it("el submenú muestra Horario y Bloqueos al equipo sin admin", () => {
    act(() => {
      root.render(<SidebarNav isAdmin={false} />);
    });

    expect(botonDisponibilidad().getAttribute("aria-expanded")).toBe("false");
    abrirDisponibilidad();
    expect(botonDisponibilidad().getAttribute("aria-expanded")).toBe("true");
    expect(etiquetasSubmenu()).toEqual(["Horario", "Bloqueos"]);
  });

  it("el submenú suma Feriados para el admin", () => {
    act(() => {
      root.render(<SidebarNav isAdmin={true} />);
    });

    abrirDisponibilidad();
    expect(etiquetasSubmenu()).toEqual(["Horario", "Bloqueos", "Feriados"]);
  });

  it("el super admin sólo ve Organizaciones", () => {
    act(() => {
      root.render(<SidebarNav isAdmin={false} isSuperAdmin={true} />);
    });

    expect(enlaces().map((a) => a.textContent?.trim())).toEqual(["Organizaciones"]);
  });
});
