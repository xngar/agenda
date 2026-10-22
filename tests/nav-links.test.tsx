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

function etiquetas(): string[] {
  return enlaces().map((a) => a.textContent?.trim() ?? "");
}

describe("SidebarNav", () => {
  it("sin admin ve Mi agenda, Pacientes, Mi Horario y Bloqueos, y el activo se marca", () => {
    act(() => {
      root.render(<SidebarNav isAdmin={false} />);
    });

    const links = enlaces();
    expect(links).toHaveLength(4);
    expect(etiquetas()).toEqual(["Mi agenda", "Pacientes", "Mi Horario", "Bloqueos"]);

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

  it("el admin ve los siete accesos en orden, sin el botón Disponibilidad", () => {
    act(() => {
      root.render(<SidebarNav isAdmin={true} />);
    });

    expect(enlaces()).toHaveLength(7);
    expect(etiquetas()).toEqual([
      "Mi agenda",
      "Pacientes",
      "Mi Horario",
      "Bloqueos",
      "Feriados",
      "Equipo",
      "Servicios",
    ]);
    expect(container.querySelector("nav button")).toBeNull();
    expect(container.textContent).not.toContain("Disponibilidad");

    for (const a of enlaces()) {
      expect(a.querySelector("svg")).not.toBeNull();
    }
  });

  it("Feriados, Equipo y Servicios quedan ocultos sin admin", () => {
    act(() => {
      root.render(<SidebarNav isAdmin={false} />);
    });

    const labels = etiquetas();
    expect(labels).toContain("Mi Horario");
    expect(labels).toContain("Bloqueos");
    expect(labels).not.toContain("Feriados");
    expect(labels).not.toContain("Equipo");
    expect(labels).not.toContain("Servicios");
  });

  it("los accesos de disponibilidad conservan sus rutas", () => {
    act(() => {
      root.render(<SidebarNav isAdmin={true} />);
    });

    expect(enlaces().map((a) => a.getAttribute("href"))).toEqual([
      "/dashboard",
      "/dashboard/pacientes",
      "/dashboard/horario",
      "/dashboard/bloqueos",
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
