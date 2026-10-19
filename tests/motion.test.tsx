import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { AsyncButton } from "@/components/motion/async-button";

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
  vi.restoreAllMocks();
});

describe("AnimatedNumber", () => {
  it("muestra el valor final en el primer render (lo que ve el servidor)", () => {
    act(() => {
      root.render(<AnimatedNumber value={42} />);
    });

    expect(container.textContent).toBe("42");
  });

  it("cuenta hacia el valor al montar", () => {
    vi.useFakeTimers();
    const raf = vi.spyOn(globalThis, "requestAnimationFrame");

    act(() => {
      root.render(<AnimatedNumber value={100} />);
    });

    // Se pide un frame: el conteo arranca en el cliente.
    expect(raf).toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(container.textContent).toBe("100");
    vi.useRealTimers();
  });

  it("respeta el formato que se le pase", () => {
    act(() => {
      root.render(<AnimatedNumber value={7} format={(n) => `${n} citas`} />);
    });

    expect(container.textContent).toBe("7 citas");
  });
});

describe("AsyncButton", () => {
  it("muestra el spinner sin cambiar el texto del boton", async () => {
    let resolver: () => void = () => {};
    const promesa = new Promise<void>((r) => {
      resolver = r;
    });

    act(() => {
      root.render(<AsyncButton onClick={() => promesa}>Guardar</AsyncButton>);
    });

    const boton = container.querySelector("button") as HTMLButtonElement;
    expect(boton.textContent).toContain("Guardar");

    await act(async () => {
      boton.click();
    });

    // El spinner se superpone: el texto sigue estando.
    expect(boton.textContent).toContain("Guardar");
    expect(boton.disabled).toBe(true);

    await act(async () => {
      resolver();
      await promesa;
    });
  });

  it("en modo controlado no superpone la confirmacion de exito", async () => {
    let resolver: () => void = () => {};
    const promesa = new Promise<void>((r) => {
      resolver = r;
    });

    act(() => {
      root.render(
        <AsyncButton loading={false} onClick={() => promesa}>
          Guardar
        </AsyncButton>,
      );
    });

    const boton = container.querySelector("button") as HTMLButtonElement;
    await act(async () => {
      boton.click();
      resolver();
      await promesa;
    });

    expect(boton.textContent).not.toContain("Listo");
  });

  it("confirma el exito cuando gestiona la accion por su cuenta", async () => {
    act(() => {
      root.render(<AsyncButton onClick={() => undefined}>Guardar</AsyncButton>);
    });

    const boton = container.querySelector("button") as HTMLButtonElement;
    await act(async () => {
      boton.click();
    });

    expect(boton.textContent).toContain("Listo");
  });
});
