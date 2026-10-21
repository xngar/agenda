import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { DoctorAppointment } from "@/lib/types";
import { AgendaTable } from "@/app/dashboard/(panel)/agenda-table";

function cita(partial: Partial<DoctorAppointment> & { id: string }): DoctorAppointment {
  return {
    doctor_id: "doc-1",
    patient_id: "pat-1",
    service_id: "srv-1",
    during: { start: "2026-10-14T13:00:00+00:00", end: "2026-10-14T13:30:00+00:00" },
    status: "pending",
    cancelled_by: null,
    cancel_reason: null,
    created_at: "2026-10-13T00:00:00+00:00",
    rescheduled_at: null,
    patient: { full_name: "Paciente Base", phone: "+56911111111", email: "a@x.cl", rut: "11111111-1" },
    service: { name: "Limpieza", duration_min: 30 },
    ...partial,
  } as DoctorAppointment;
}

const CITAS: DoctorAppointment[] = [
  cita({ id: "c1", status: "pending", patient: { full_name: "Ana Soto", phone: null, email: "ana@x.cl", rut: null } }),
  cita({ id: "c2", status: "confirmed", patient: { full_name: "Beto Díaz", phone: null, email: "beto@x.cl", rut: null } }),
  cita({ id: "c3", status: "cancelled", cancel_reason: "Paciente lo pidió", patient: { full_name: "Ceci Ruiz", phone: null, email: "ceci@x.cl", rut: null } }),
];

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

function renderTable(citas = CITAS, onAccion = vi.fn()) {
  act(() => {
    root.render(
      <AgendaTable
        citas={citas}
        pendiente={null}
        onAccion={onAccion}
        orgName="Clínica Sonrisa"
      />,
    );
  });
  return onAccion;
}

describe("AgendaTable", () => {
  it("renderiza una fila por cita con su estado", () => {
    renderTable();
    const table = container.querySelector('[data-testid="agenda-table"]');
    expect(table).not.toBeNull();
    expect(table?.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(container.textContent).toContain("Por confirmar");
    expect(container.textContent).toContain("Confirmada");
    expect(container.textContent).toContain("Cancelada");
  });

  it("solo la cita pendiente ofrece Confirmar y la cancelada muestra el motivo", () => {
    renderTable();
    expect(container.querySelectorAll("tbody tr")[0]?.textContent).toContain("Confirmar");
    expect(container.querySelectorAll("tbody tr")[1]?.textContent).not.toContain("Confirmar");
    expect(container.textContent).toContain("Motivo: Paciente lo pidió");
  });

  it("delega la acción con id y tipo al hacer clic", () => {
    const onAccion = renderTable();
    const confirmar = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "Confirmar",
    );
    act(() => {
      confirmar?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onAccion).toHaveBeenCalledWith("c1", "confirmed");
  });

  it("ofrece Reagendar en citas vigentes y la delega como reschedule", () => {
    const onAccion = renderTable();
    const filas = container.querySelectorAll("tbody tr");
    expect(filas[0]?.textContent).toContain("Reagendar");
    expect(filas[1]?.textContent).toContain("Reagendar");
    expect(filas[2]?.textContent).not.toContain("Reagendar");
    const reagendar = [...filas[0]?.querySelectorAll("button") ?? []].find(
      (b) => b.textContent === "Reagendar",
    );
    act(() => {
      reagendar?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onAccion).toHaveBeenCalledWith("c1", "reschedule");
  });

  it("deshabilita los botones de la cita en curso", () => {
    act(() => {
      root.render(
        <AgendaTable
          citas={CITAS}
          pendiente="c1conf"
          onAccion={vi.fn()}
          orgName="Clínica Sonrisa"
        />,
      );
    });
    const primeraFila = container.querySelectorAll("tbody tr")[0];
    const botones = primeraFila?.querySelectorAll("button") ?? [];
    expect(botones.length).toBeGreaterThan(0);
    for (const b of botones) expect((b as HTMLButtonElement).disabled).toBe(true);
  });

  it("ofrece WhatsApp por cita y lo deshabilita sin celular", () => {
    renderTable();
    const botones = container.querySelectorAll(
      'button[aria-label^="Enviar WhatsApp"], button[aria-label^="Sin celular"]',
    );
    expect(botones).toHaveLength(3);
    for (const b of botones) expect((b as HTMLButtonElement).disabled).toBe(true);
  });

  it("separa teléfono y correo y conserva el correo completo", () => {
    const correo = "eva.ruiz.con.correo.muy.largo@clinica.cl";
    const conContacto = [
      cita({
        id: "c20",
        patient: { full_name: "Eva Ruiz", phone: "+56 9 8765 4321", email: correo, rut: null },
      }),
    ];
    act(() => {
      root.render(
        <AgendaTable
          citas={conContacto}
          pendiente={null}
          onAccion={vi.fn()}
          orgName="Clínica Sonrisa"
        />,
      );
    });

    const fila = container.querySelectorAll("tbody tr")[0];
    const contacto = fila?.querySelectorAll("td")[2];
    expect(contacto?.textContent).not.toContain("·");
    expect(contacto?.textContent).toContain("+56 9 8765 4321");
    expect(contacto?.textContent).toContain(correo);
  });

  it("habilita WhatsApp cuando la cita tiene celular", () => {
    const conCelular = [
      cita({
        id: "c9",
        patient: { full_name: "Dora Paz", phone: "+56 9 1234 5678", email: "", rut: null },
      }),
    ];
    act(() => {
      root.render(
        <AgendaTable
          citas={conCelular}
          pendiente={null}
          onAccion={vi.fn()}
          orgName="Clínica Sonrisa"
        />,
      );
    });
    const boton = container.querySelector('button[aria-label^="Enviar WhatsApp"]');
    expect(boton).not.toBeNull();
    expect((boton as HTMLButtonElement).disabled).toBe(false);
  });

  it("muestra una cita no asistida en rojo aunque tenga una reagenda previa", () => {
    renderTable([
      cita({
        id: "c30",
        status: "no_show",
        rescheduled_at: "2026-10-20T12:00:00+00:00",
      }),
    ]);
    const fila = container.querySelector("tbody tr");
    expect(fila?.className).toContain("bg-danger-100");
    expect(fila?.className).not.toContain("bg-success-100");
  });

  it("muestra una cita atendida en celeste aunque tenga una reagenda previa", () => {
    renderTable([
      cita({
        id: "c31",
        status: "completed",
        rescheduled_at: "2026-10-20T12:00:00+00:00",
      }),
    ]);
    const fila = container.querySelector("tbody tr");
    expect(fila?.className).toContain("bg-brand-sky-100");
    expect(fila?.className).not.toContain("bg-success-100");
  });
});
