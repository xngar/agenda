import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AddMemberButton } from "@/app/dashboard/(panel)/admin/add-member-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
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
});

function abrirModal() {
  act(() => {
    root.render(<AddMemberButton />);
  });
  const abrir = [...container.querySelectorAll("button")].find(
    (b) => b.textContent === "Agregar miembro",
  );
  act(() => {
    abrir?.click();
  });
}

describe("AddMemberModal", () => {
  it("permite mostrar y ocultar la contraseña temporal", () => {
    abrirModal();

    const clave = document.querySelector<HTMLInputElement>("#miembro-clave");
    expect(clave?.type).toBe("password");

    const mostrar = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Mostrar contraseña"]',
    );
    expect(mostrar).not.toBeNull();

    act(() => {
      mostrar?.click();
    });

    expect(document.querySelector<HTMLInputElement>("#miembro-clave")?.type).toBe("text");
    expect(
      document.querySelector('button[aria-label="Ocultar contraseña"]'),
    ).not.toBeNull();

    act(() => {
      document
        .querySelector<HTMLButtonElement>('button[aria-label="Ocultar contraseña"]')
        ?.click();
    });

    expect(document.querySelector<HTMLInputElement>("#miembro-clave")?.type).toBe("password");
  });
});
