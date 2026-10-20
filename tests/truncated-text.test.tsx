import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TruncatedText } from "@/components/ui/truncated-text";

let root: Root;
let container: HTMLDivElement;

function medir(scrollWidth: number, clientWidth: number) {
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
    configurable: true,
    get: () => scrollWidth,
  });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => clientWidth,
  });
}

function limpiarMedidas() {
  Reflect.deleteProperty(HTMLElement.prototype, "scrollWidth");
  Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
}

beforeEach(() => {
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
  limpiarMedidas();
  vi.useRealTimers();
});

function render(texto = "paciente@clinica.cl") {
  act(() => {
    root.render(<TruncatedText text={texto} className="max-w-52" />);
  });
  return container.querySelector("span") as HTMLSpanElement;
}

describe("TruncatedText", () => {
  it("muestra el texto completo sin tooltip cuando cabe", () => {
    medir(100, 200);
    const span = render();

    expect(span.textContent).toBe("paciente@clinica.cl");
    expect(span.title).toBe("");
    expect(span.hasAttribute("tabindex")).toBe(false);
  });

  it("hace foco al texto cortado para poder leerlo", () => {
    medir(300, 200);
    const span = render("paciente.con.un.correo.muy.largo@clinica.cl");

    expect(span.textContent).toBe("paciente.con.un.correo.muy.largo@clinica.cl");
    expect(span.getAttribute("tabindex")).toBe("0");
  });

  it("muestra el texto acortado y el original en el tooltip", () => {
    vi.useFakeTimers();
    medir(100, 200);
    const completo = "informe_radiografia_panoramica_2026_version_final.pdf";
    const visible = "informe_radiografia…final.pdf";

    act(() => {
      root.render(<TruncatedText text={visible} fullText={completo} className="max-w-52" />);
    });
    const span = container.querySelector("span") as HTMLSpanElement;

    expect(span.textContent).toBe(visible);
    expect(span.getAttribute("tabindex")).toBe("0");

    act(() => {
      span.focus();
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const contenido = document.querySelector('[data-slot="tooltip-content"]');
    expect(contenido?.textContent).toBe(completo);
  });

  it("abre el tooltip con el texto completo al enfocar", () => {
    vi.useFakeTimers();
    medir(300, 200);
    const texto = "paciente.con.un.correo.muy.largo@clinica.cl";
    const span = render(texto);

    act(() => {
      span.focus();
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const contenido = document.querySelector('[data-slot="tooltip-content"]');
    expect(contenido?.textContent).toBe(texto);
  });
});
