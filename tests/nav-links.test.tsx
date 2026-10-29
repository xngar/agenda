import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";

const ruta = vi.hoisted(() => ({ pathname: "/dashboard/pacientes" }));

vi.mock("next/navigation", () => ({
  usePathname: () => ruta.pathname,
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
}));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  ruta.pathname = "/dashboard/pacientes";
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

function etiquetas(): string[] {
  return enlaces().map((a) => a.textContent?.trim() ?? "");
}

function botonAdministracion(): HTMLButtonElement | null {
  return container.querySelector("nav button");
}

function clic(boton: Element) {
  act(() => {
    boton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("SidebarNav", () => {
  it("sin admin ve Mi agenda, Pacientes, Mi Horario, Bloqueos y Estadísticas, y el activo se marca", () => {
    act(() => {
      root.render(<SidebarNav isAdmin={false} />);
    });

    const links = enlaces();
    expect(links).toHaveLength(5);
    expect(etiquetas()).toEqual(["Mi agenda", "Pacientes", "Mi Horario", "Bloqueos", "Estadísticas"]);

    for (const a of links) {
      expect(a.querySelector("svg")).not.toBeNull();
      expect(a.textContent?.trim().length).toBeGreaterThan(0);
    }

    const pacientes = links.find((a) => a.getAttribute("href") === "/dashboard/pacientes");
    expect(pacientes?.getAttribute("aria-current")).toBe("page");
    expect(pacientes?.className).toContain("text-action-primary");
    const agenda = links.find((a) => a.getAttribute("href") === "/dashboard");
    expect(agenda?.getAttribute("aria-current")).toBeNull();
  });

  it("el admin ve los ocho accesos en orden, con Administración cerrado", () => {
    act(() => {
      root.render(<SidebarNav isAdmin={true} />);
    });

    expect(enlaces()).toHaveLength(8);
    expect(etiquetas()).toEqual([
      "Mi agenda",
      "Pacientes",
      "Mi Horario",
      "Bloqueos",
      "Estadísticas",
      "Feriados",
      "Equipo",
      "Servicios",
    ]);

    const grupo = botonAdministracion();
    expect(grupo?.textContent).toContain("Administración");
    expect(grupo?.getAttribute("aria-expanded")).toBe("false");
    expect(container.textContent).not.toContain("Disponibilidad");

    for (const a of enlaces()) {
      expect(a.querySelector("svg")).not.toBeNull();
    }
  });

  it("Administración despliega y repliega Feriados, Equipo y Servicios", () => {
    act(() => {
      root.render(<SidebarNav isAdmin={true} />);
    });

    const grupo = botonAdministracion();
    expect(grupo).not.toBeNull();

    clic(grupo!);
    expect(grupo?.getAttribute("aria-expanded")).toBe("true");

    clic(grupo!);
    expect(grupo?.getAttribute("aria-expanded")).toBe("false");
  });

  it("Administración arranca abierto en las rutas que contiene", () => {
    for (const pathname of ["/dashboard/feriados", "/dashboard/admin", "/dashboard/servicios"]) {
      ruta.pathname = pathname;
      act(() => {
        root.render(<SidebarNav isAdmin={true} />);
      });
      expect(botonAdministracion()?.getAttribute("aria-expanded")).toBe("true");
    }
  });

  it("Feriados, Equipo y Servicios quedan ocultos sin admin", () => {
    act(() => {
      root.render(<SidebarNav isAdmin={false} />);
    });

    const labels = etiquetas();
    expect(labels).toContain("Estadísticas");
    expect(labels).toContain("Mi Horario");
    expect(labels).toContain("Bloqueos");
    expect(labels).not.toContain("Feriados");
    expect(labels).not.toContain("Equipo");
    expect(labels).not.toContain("Servicios");
    expect(botonAdministracion()).toBeNull();
  });

  it("los accesos conservan sus rutas", () => {
    act(() => {
      root.render(<SidebarNav isAdmin={true} />);
    });

    expect(enlaces().map((a) => a.getAttribute("href"))).toEqual([
      "/dashboard",
      "/dashboard/pacientes",
      "/dashboard/horario",
      "/dashboard/bloqueos",
      "/dashboard/estadisticas",
      "/dashboard/feriados",
      "/dashboard/admin",
      "/dashboard/servicios",
    ]);
  });

  it("el super admin sólo ve Organizaciones", () => {
    act(() => {
      root.render(<SidebarNav isAdmin={false} isSuperAdmin={true} />);
    });

    expect(etiquetas()).toEqual(["Organizaciones"]);
  });
});
