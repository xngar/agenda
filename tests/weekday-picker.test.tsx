import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import WeekdayPicker from "@/components/booking/weekday-picker";

/**
 * El bug que esto fija: la grilla mostraba 14 días consecutivos desde hoy
 * bajo un encabezado estático Lu…Do, así que los números caían en la
 * columna equivocada (el miércoles 7 de octubre aparecía bajo "Lu").
 * La grilla ahora se alinea a la semana real con celdas de días pasados.
 */

const HOY_MIERCOLES = new Date("2026-10-07T15:00:00Z"); // 12:00 en Santiago
const HOY_LUNES = new Date("2026-10-05T15:00:00Z");
const HOY_VIERNES = new Date("2026-10-02T15:00:00Z");

let root: Root;
let container: HTMLDivElement;

function renderPicker() {
  act(() => {
    root.render(
      <WeekdayPicker
        holidays={[]}
        maxDaysAhead={30}
        minNoticeHours={2}
        selected={null}
        statuses={{}}
        onSelect={vi.fn()}
      />,
    );
  });
}

function gridChildren(): Element[] {
  const grid = container.querySelector('[role="group"]');
  if (!grid) throw new Error("no se renderizó la grilla");
  return [...grid.children];
}

function indexOfCell(text: string): number {
  return gridChildren().findIndex((el) => (el.getAttribute("aria-label") ?? "").includes(text));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(HOY_MIERCOLES);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe("WeekdayPicker", () => {
  it("miércoles 7 de octubre cae bajo la columna Mi", () => {
    renderPicker();

    const children = gridChildren();
    // 7 encabezados (Lu…Do) + 2 días pasados (5 y 6) = el 7 en el índice 9.
    const idx = indexOfCell("miércoles, 7");
    expect(idx).toBe(9);
    expect(idx % 7).toBe(2); // columna 2 = "Mi"
    expect(children[2]?.textContent).toBe("Mi");

    // El rango de celdas cierra en filas completas de 7.
    expect((children.length - 7) % 7).toBe(0);
  });

  it("los días pasados de la semana van primero, deshabilitados y sin tachar", () => {
    renderPicker();

    const buttons = [...gridChildren().slice(7)].filter(
      (el) => el.tagName === "BUTTON",
    );
    const primero = buttons[0] as HTMLButtonElement;
    const segundo = buttons[1] as HTMLButtonElement;

    expect(primero.getAttribute("aria-label")).toContain("lunes");
    expect(primero.getAttribute("aria-label")).toContain("5 de octubre");
    expect(primero.disabled).toBe(true);
    expect(primero.title).toBe("Día pasado");
    expect(primero.className).not.toContain("line-through");

    expect(segundo.getAttribute("aria-label")).toContain("martes");
    expect(segundo.getAttribute("aria-label")).toContain("6 de octubre");
    expect(segundo.disabled).toBe(true);

    // Hoy (miércoles 7) sí es elegible y no lleva marcas de pasado.
    const hoy = buttons[2] as HTMLButtonElement;
    expect(hoy.disabled).toBe(false);
    expect(hoy.title).toBe("");
  });

  it("empezando en lunes no hay celdas pasadas", () => {
    vi.setSystemTime(HOY_LUNES);
    renderPicker();

    const idx = indexOfCell("lunes, 5");
    expect(idx).toBe(7); // primer botón, justo tras los encabezados
    expect(idx % 7).toBe(0); // columna "Lu"
    expect(gridChildren()[0]?.textContent).toBe("Lu");
  });

  it("al cruzar de mes la etiqueta muestra ambos meses", () => {
    vi.setSystemTime(HOY_VIERNES);
    renderPicker();

    // Viernes 2 de octubre: la semana arranca el 28 de septiembre.
    expect(indexOfCell("viernes, 2")).toBe(7 + 4); // 4 días pasados
    expect(container.textContent).toContain("septiembre – octubre");
  });
});
