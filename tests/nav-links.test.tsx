import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NavLinks } from "@/app/dashboard/nav-links";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/pacientes",
}));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("NavLinks", () => {
  it("cada enlace lleva icono y texto, y el activo se marca", () => {
    act(() => {
      root.render(<NavLinks isAdmin={false} />);
    });

    const links = [...container.querySelectorAll("nav a")];
    expect(links).toHaveLength(4);
    for (const a of links) {
      expect(a.querySelector("svg")).not.toBeNull();
      expect(a.textContent?.trim().length).toBeGreaterThan(0);
    }

    const pacientes = links.find((a) => a.getAttribute("href") === "/dashboard/pacientes");
    expect(pacientes?.getAttribute("aria-current")).toBe("page");
    const agenda = links.find((a) => a.getAttribute("href") === "/dashboard");
    expect(agenda?.getAttribute("aria-current")).toBeNull();
  });

  it("el admin ve Equipo, Servicios y Feriados con icono", () => {
    act(() => {
      root.render(<NavLinks isAdmin={true} />);
    });
    const links = [...container.querySelectorAll("nav a")];
    expect(links).toHaveLength(7);
    expect(container.textContent).toContain("Feriados");
  });
});
