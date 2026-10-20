import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { EditEmailButton } from "@/app/dashboard/(panel)/admin/edit-email-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let root: Root;
let container: HTMLDivElement;

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

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.querySelectorAll("[data-radix-portal], .modal-panel, [data-modal-root]").forEach((el) => {
    el.remove();
  });
});

describe("EditEmailButton", () => {
  it("abre el modal con el correo actual precargado", () => {
    act(() => {
      root.render(<EditEmailButton doctorId="1" initialEmail="camila@clinica.cl" />);
    });

    const editar = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "Editar correo",
    );
    expect(editar).toBeDefined();

    act(() => {
      editar?.click();
    });

    const input = document.querySelector<HTMLInputElement>("#miembro-correo-nuevo");
    expect(input?.value).toBe("camila@clinica.cl");
    expect(document.body.textContent).toContain("Editar correo de acceso");
  });
});
