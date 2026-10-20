import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { EstadisticasView } from "@/app/dashboard/(panel)/estadisticas/estadisticas-view";
import type { StatsSnapshot } from "@/lib/stats/types";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/estadisticas",
}));

function snapshot(kpis: StatsSnapshot["kpis"]): StatsSnapshot {
  return {
    range: { from: "2026-09-21", to: "2026-10-20" },
    previousRange: { from: "2026-08-22", to: "2026-09-20" },
    doctorId: null,
    kpis,
    daily: [],
    patients: [],
    services: [],
    heatmap: [],
    inactivePatients: 0,
    recurringPatients: 0,
    horasAgendadas: null,
    horasAgendadasPrevias: null,
  };
}

let root: Root;
let container: HTMLDivElement;

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
});

describe("EstadisticasView", () => {
  it("muestra las tarjetas KPI con su valor y comparación", () => {
    const s = snapshot([
      {
        key: "citas",
        label: "Citas del periodo",
        current: 45,
        previous: 30,
        deltaPct: 50,
        deltaPoints: null,
        unit: "count",
      },
      {
        key: "inasistencia",
        label: "Inasistencia",
        current: 12,
        previous: 5,
        deltaPct: null,
        deltaPoints: 7,
        unit: "pct",
        goodDown: true,
      },
    ]);

    act(() => {
      root.render(
        <EstadisticasView snapshot={s} periodoLabel="Últimos 30 días" periodoPrevioLabel="" />,
      );
    });

    expect(container.textContent).toContain("Citas del periodo");
    expect(container.textContent).toContain("45");
    expect(container.textContent).toContain("+50%");
    // Inasistencia subió: el chip debe verse como riesgo (rojo), no como éxito.
    const chips = [...container.querySelectorAll("span")];
    const chipInasistencia = chips.find((c) => c.textContent === "+7 pts");
    expect(chipInasistencia?.className).toContain("bg-rose-50");
  });

  it("muestra el estado vacío cuando no hay datos", () => {
    const s = snapshot([
      {
        key: "citas",
        label: "Citas del periodo",
        current: 0,
        previous: null,
        deltaPct: null,
        deltaPoints: null,
        unit: "count",
      },
    ]);

    act(() => {
      root.render(
        <EstadisticasView snapshot={s} periodoLabel="Últimos 30 días" periodoPrevioLabel="" />,
      );
    });

    expect(container.textContent).toContain("Sin actividad en el periodo");
  });
});
