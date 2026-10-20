import type { AppointmentStatus } from "@/lib/types";

/**
 * Tonos que destacan una cita cuyo vuelo el paciente o el staff cambió:
 * cancelada = rojo, reagendada = verde (rescheduled_at lo estampan las RPC
 * de reagendar). La cancelada gana sobre la reagendada, porque es el
 * estado final. `RIEL` / `CHIP_TONO` / `CHIP` siguen mandando cuando
 * devuelve null.
 */
export function resaltarCita(cita: { status: AppointmentStatus; rescheduled_at: string | null }): {
  borde: string;
  fondo: string;
  texto: string;
} | null {
  if (cita.status === "cancelled") {
    return { borde: "border-2 border-danger-600", fondo: "bg-danger-100", texto: "text-danger-700" };
  }
  if (cita.rescheduled_at) {
    return { borde: "border-2 border-success-600", fondo: "bg-success-100", texto: "text-success-700" };
  }
  return null;
}
