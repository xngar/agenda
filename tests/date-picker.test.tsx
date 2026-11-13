import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { DatePicker } from "@/components/ui/date-picker";

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  (
    globalThis as unknown as { ResizeObserver: unknown }
  ).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("DatePicker", () => {
  it("muestra el día en español y avisa la fecha elegida como clave", () => {
    const onChange = vi.fn();
    act(() => {
      root.render(
        <DatePicker id="filtro-dia" value="2026-11-06" onChange={onChange} />,
      );
    });

    const trigger = container.querySelector<HTMLButtonElement>("#filtro-dia");
    expect(trigger?.textContent).toContain("6 nov 2026");

    act(() => {
      trigger?.click();
    });

    const dias = [
      ...document.querySelectorAll<HTMLButtonElement>("button[data-day]"),
    ];
    const dia = dias.find((b) => b.textContent === "10");
    expect(dia).toBeDefined();

    act(() => {
      dia?.click();
    });

    expect(onChange).toHaveBeenCalledWith("2026-11-10");
  });
});
