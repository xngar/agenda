import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LoginForm } from "@/app/dashboard/login/login-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
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

function passwordInput(): HTMLInputElement {
  const input = container.querySelector('input[name="password"]');
  if (!input) throw new Error("no se renderizó el input de contraseña");
  return input as HTMLInputElement;
}

function toggle(): HTMLButtonElement {
  const button = container.querySelector('button[aria-label*="contraseña"]');
  if (!button) throw new Error("no se renderizó el botón mostrar/ocultar");
  return button as HTMLButtonElement;
}

describe("LoginForm", () => {
  it("la contraseña parte oculta y el botón la muestra y la vuelve a ocultar", () => {
    act(() => {
      root.render(<LoginForm />);
    });

    expect(passwordInput().type).toBe("password");
    expect(toggle().getAttribute("aria-label")).toBe("Mostrar contraseña");

    act(() => {
      toggle().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(passwordInput().type).toBe("text");
    expect(toggle().getAttribute("aria-pressed")).toBe("true");
    expect(toggle().getAttribute("aria-label")).toBe("Ocultar contraseña");

    act(() => {
      toggle().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(passwordInput().type).toBe("password");
  });

  it("el botón es type=button para no enviar el formulario", () => {
    act(() => {
      root.render(<LoginForm />);
    });
    expect(toggle().type).toBe("button");
  });
});
