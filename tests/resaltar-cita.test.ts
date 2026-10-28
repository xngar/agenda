import { describe, expect, it } from "vitest";
import type { AppointmentStatus } from "@/lib/types";
import { resaltarCita } from "@/app/dashboard/(panel)/resaltar-cita";

function cita(status: AppointmentStatus, rescheduled_at: string | null = null) {
  return { status, rescheduled_at };
}

describe("resaltarCita", () => {
  it("pinta en rojo una cita no asistida aunque tenga una reagenda previa", () => {
    const resalte = resaltarCita(cita("no_show", "2026-10-20T12:00:00+00:00"));
    expect(resalte?.borde).toContain("danger-600");
    expect(resalte?.fondo).toContain("danger-100");
    expect(resalte?.texto).toContain("danger-700");
    expect(resalte?.borde).not.toContain("success");
  });

  it("la cancelación también gana sobre la reagenda", () => {
    const resalte = resaltarCita(cita("cancelled", "2026-10-20T12:00:00+00:00"));
    expect(resalte?.borde).toContain("danger-600");
    expect(resalte?.borde).not.toContain("success");
  });

  it("una cita atendida usa celeste y no conserva el verde de reagendada", () => {
    const resalte = resaltarCita(cita("completed", "2026-10-20T12:00:00+00:00"));
    expect(resalte?.borde).toContain("brand-sky-600");
    expect(resalte?.fondo).toContain("brand-sky-100");
    expect(resalte?.borde).not.toContain("success");
  });

  it("solo una cita activa reagendada conserva el verde", () => {
    expect(resaltarCita(cita("confirmed", "2026-10-20T12:00:00+00:00"))?.borde).toContain(
      "success-600",
    );
    expect(resaltarCita(cita("pending", "2026-10-20T12:00:00+00:00"))?.borde).toContain(
      "success-600",
    );
  });

  it("no resalta una cita activa que no fue reagendada", () => {
    expect(resaltarCita(cita("confirmed"))).toBeNull();
  });
});
