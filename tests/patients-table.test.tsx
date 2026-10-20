import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  PatientsTable,
  type ListPatient,
} from "@/app/dashboard/(panel)/pacientes/patients-table";

const LARGO = "paciente.con.un.correo.muy.largo@clinica.cl";

const PACIENTES: ListPatient[] = [
  {
    id: "p1",
    full_name: "Ana Soto",
    rut: "11111111-1",
    phone: "+56 9 1111 1111",
    email: LARGO,
    birth_date: null,
    sex: "female",
  },
  {
    id: "p2",
    full_name: "Beto Díaz",
    rut: "22222222-2",
    phone: null,
    email: "beto@x.cl",
    birth_date: null,
    sex: "male",
  },
  {
    id: "p3",
    full_name: "Carla Ruiz",
    rut: null,
    phone: null,
    email: null,
    birth_date: null,
    sex: null,
  },
];

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

function render() {
  act(() => {
    root.render(
      <PatientsTable
        patients={PACIENTES}
        total={PACIENTES.length}
        page={1}
        totalPages={1}
        params={{ q: "", status: "", sort: "full_name", dir: "asc" }}
        orgName="Clínica Sonrisa"
      />,
    );
  });
}

describe("PatientsTable", () => {
  it("muestra el correo largo completo en la tabla de escritorio", () => {
    render();
    const tabla = container.querySelector('[data-testid="patients-table"]');
    expect(tabla?.textContent).toContain(LARGO);
  });

  it("separa teléfono y correo en la tabla de escritorio", () => {
    render();
    const fila = container.querySelectorAll('[data-testid="patients-table"] tbody tr')[0];
    const celdas = fila?.querySelectorAll("td");
    const contacto = celdas?.[2];

    expect(contacto?.textContent).not.toContain("·");
    expect(contacto?.textContent).toContain("+56 9 1111 1111");
    expect(contacto?.textContent).toContain(LARGO);
  });

  it("muestra el correo completo en la tarjeta móvil sin unirlo al teléfono", () => {
    render();
    const tarjeta = container.querySelectorAll('[data-testid="patients-cards"] li')[0];
    const contacto = tarjeta?.querySelectorAll("dd")[1];

    expect(contacto?.textContent).not.toContain("·");
    expect(contacto?.textContent).toContain("+56 9 1111 1111");
    expect(contacto?.textContent).toContain(LARGO);
  });

  it("usa el correo como contacto principal cuando no hay teléfono", () => {
    render();
    const fila = container.querySelectorAll('[data-testid="patients-table"] tbody tr')[1];
    const contacto = fila?.querySelectorAll("td")[2];
    expect(contacto?.textContent).toBe("beto@x.cl");
  });

  it("muestra un guion cuando no hay datos de contacto", () => {
    render();
    const fila = container.querySelectorAll('[data-testid="patients-table"] tbody tr')[2];
    const contacto = fila?.querySelectorAll("td")[2];
    expect(contacto?.textContent).toBe("—");
  });
});
