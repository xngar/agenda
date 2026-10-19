"use client";

import { formatTime } from "@/lib/dates";
import { parseAppointmentRange } from "@/lib/range";
import { StatusBadge } from "@/components/ui";
import { WhatsappButton } from "@/components/dashboard/whatsapp-button";
import type { DoctorAppointment } from "@/lib/types";
import { Accion, RIEL } from "./agenda-table";
import { reprogramable } from "./agenda-actions";

/**
 * Tarjetas de cita para pantallas angostas (la tabla de 5 columnas no entra).
 * Las usan la vista día y la semanal; la lógica de estado vive en
 * `useAgendaAcciones`, no aquí.
 */
export function AgendaCards({
  citas,
  pendiente,
  onCambiar,
  onReagendar,
  orgName,
}: {
  citas: DoctorAppointment[];
  /** `id + action` de la cita ocupada, para deshabilitar sus botones. */
  pendiente: string | null;
  onCambiar: (appointmentId: string, action: string) => void;
  onReagendar: (cita: DoctorAppointment) => void;
  /** Nombre de la clínica, para el mensaje de WhatsApp. */
  orgName: string;
}) {
  return (
    <ul className="space-y-2 md:hidden" data-testid="agenda-cards">
      {citas.map((cita, i) => {
        const { start, end } = parseAppointmentRange(cita.during);
        const cancelada = cita.status === "cancelled";
        const ocupado = pendiente?.startsWith(cita.id) ?? false;

        return (
          <li
            key={cita.id}
            style={{ animationDelay: `${Math.min(i, 8) * 24}ms` }}
            className={`anim-month-cell flex gap-3 rounded-card border border-neutral-200 border-l-[4px] p-4 transition-shadow hover:shadow-card sm:gap-4 ${
              RIEL[cita.status] ?? "border-l-neutral-300 bg-white"
            } ${cancelada ? "opacity-70" : ""}`}
          >
            {/*
              La hora es el ancla de la lectura: gutter tabular a la
              izquierda, igual que la grilla mensual usa el riel de
              color para contar el estado de un vistazo.
            */}
            <div className="w-14 shrink-0 pt-0.5 text-right sm:w-16">
              <p className="text-base font-semibold tabular-nums text-brand-navy">
                {formatTime(start)}
              </p>
              <p className="text-xs tabular-nums text-neutral-600">{formatTime(end)}</p>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-neutral-900">
                    {cita.patient?.full_name ?? "Paciente"}
                  </p>
                  {cita.service?.name ? (
                    <p className="mt-0.5 truncate text-sm text-neutral-600">{cita.service.name}</p>
                  ) : null}
                  <p className="mt-0.5 truncate text-xs text-neutral-600">
                    {[cita.patient?.rut, cita.patient?.phone, cita.patient?.email]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <StatusBadge status={cita.status} />
              </div>

              {cita.status === "cancelled" && cita.cancel_reason ? (
                <p className="mt-2 text-sm text-neutral-500">Motivo: {cita.cancel_reason}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {cancelada ? (
                  <Accion
                    etiqueta="Reabrir"
                    onClick={() => onCambiar(cita.id, "reopen")}
                    disabled={ocupado}
                  />
                ) : (
                  <>
                    {/*
                      Una cita recién creada queda en `pending`. Mientras
                      no se confirme, el paciente no tiene garantía de que el
                      espacio siga reservado para él, así que el botón
                      va primero cuando corresponde.
                    */}
                    {cita.status === "pending" ? (
                      <Accion
                        etiqueta="Confirmar"
                        onClick={() => onCambiar(cita.id, "confirmed")}
                        disabled={ocupado}
                        destacado
                      />
                    ) : null}
                    <Accion
                      etiqueta="Completar"
                      onClick={() => onCambiar(cita.id, "completed")}
                      disabled={ocupado}
                    />
                    <Accion
                      etiqueta="No asistió"
                      onClick={() => onCambiar(cita.id, "no_show")}
                      disabled={ocupado}
                    />
                    {reprogramable(cita) ? (
                      <Accion
                        etiqueta="Reagendar"
                        onClick={() => onReagendar(cita)}
                        disabled={ocupado}
                      />
                    ) : null}
                    <Accion
                      etiqueta="Cancelar"
                      onClick={() => onCambiar(cita.id, "cancelled")}
                      disabled={ocupado}
                      tono="peligro"
                    />
                  </>
                )}
                <WhatsappButton
                  patientId={cita.patient_id}
                  fullName={cita.patient?.full_name ?? "Paciente"}
                  phone={cita.patient?.phone ?? null}
                  orgName={orgName}
                  disabled={ocupado}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}