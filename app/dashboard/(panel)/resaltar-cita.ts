import type { AppointmentStatus } from "@/lib/types";

/**
 * Tonos que destacan una cita cuyo vuelo el paciente o el staff cambió:
 * cancelada y no asistida = rojo, reagendada = verde (rescheduled_at lo
 * estampan las RPC de reagendar). Los estados finales ganan sobre la
 * reagenda: una cita que luego se atendió o no asistió no conserva el
 * verde. "Atendida" usa el celeste del sistema. `RIEL` / `CHIP_TONO` /
 * `CHIP` siguen mandando cuando devuelve null.
 */
export function resaltarCita(cita: { status: AppointmentStatus; rescheduled_at: string | null }): {
  borde: string;
  fondo: string;
  texto: string;
} | null {
  if (cita.status === "cancelled" || cita.status === "no_show") {
    return { borde: "border-2 border-danger-600", fondo: "bg-danger-100", texto: "text-danger-700" };
  }
  if (cita.status === "completed") {
    return {
      borde: "border-2 border-brand-sky-600",
      fondo: "bg-brand-sky-100",
      texto: "text-brand-navy-900",
    };
  }
  if (cita.rescheduled_at && (cita.status === "pending" || cita.status === "confirmed")) {
    return { borde: "border-2 border-success-600", fondo: "bg-success-100", texto: "text-success-700" };
  }
  return null;
}
