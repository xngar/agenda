"use client";

import { ChevronDown, CalendarClock, UserX, XCircle, UserRound } from "lucide-react";
import { formatTime } from "@/lib/dates";
import { parseAppointmentRange } from "@/lib/range";
import { StatusBadge } from "@/components/ui";
import { WhatsappButton } from "@/components/dashboard/whatsapp-button";
import type { DoctorAppointment } from "@/lib/types";
import { Accion, RIEL } from "./agenda-table";
import { resaltarCita } from "./resaltar-cita";
import { reprogramable } from "./agenda-actions";
import { usePatientQuickView } from "@/components/dashboard/patient-quick-view";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const { open } = usePatientQuickView();

  return (
    <ul className="space-y-2 md:hidden" data-testid="agenda-cards">
      {citas.map((cita, i) => {
        const { start, end } = parseAppointmentRange(cita.during);
        const cancelada = cita.status === "cancelled";
        const ocupado = pendiente?.startsWith(cita.id) ?? false;
        const resaltar = resaltarCita(cita);

        return (
          <li
            key={cita.id}
            style={{ animationDelay: `${Math.min(i, 8) * 24}ms` }}
            className={`anim-month-cell flex gap-3 rounded-card ${
              resaltar ? "border-2" : "border"
            } border-l-[4px] p-4 transition-shadow hover:shadow-card sm:gap-4 ${
              resaltar
                ? `${resaltar.borde} ${resaltar.fondo}`
                : `border-neutral-200 ${RIEL[cita.status] ?? "border-l-neutral-300 bg-white"}`
            } ${cancelada ? "opacity-70" : ""}`}
          >
            {/*
              La hora es el ancla de la lectura: gutter tabular a la
              izquierda, igual que la grilla mensual usa el riel de
              color para contar el estado de un vistazo.
            */}
            <div className="w-14 shrink-0 pt-0.5 text-right sm:w-16">
              <p className="text-base font-semibold tabular-nums text-action-primary">
                {formatTime(start)}
              </p>
              <p className="text-xs tabular-nums text-neutral-600">{formatTime(end)}</p>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {cita.patient ? (
                    <button
                      type="button"
                      onClick={() =>
                        open(cita.patient_id, {
                          start,
                          end,
                          serviceName: cita.service?.name ?? null,
                          status: cita.status,
                        })
                      }
                      aria-label={`Ver perfil de ${cita.patient.full_name}`}
                      className="block max-w-full truncate text-left text-[15px] font-semibold text-neutral-900 transition-colors hover:text-action-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary"
                    >
                      {cita.patient.full_name}
                    </button>
                  ) : (
                    <p className="truncate text-[15px] font-semibold text-neutral-900">Paciente</p>
                  )}
                  {cita.service?.name ? (
                    <p className="mt-0.5 truncate text-sm text-neutral-600">{cita.service.name}</p>
                  ) : null}
                  {cita.patient?.rut || cita.patient?.phone ? (
                    <p className="mt-0.5 truncate text-xs text-neutral-600">
                      {[cita.patient.rut, cita.patient.phone].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                  {cita.patient?.email ? (
                    <p className="mt-0.5 break-all text-xs text-neutral-600">
                      {cita.patient.email}
                    </p>
                  ) : null}
                  {!cita.patient?.rut && !cita.patient?.phone && !cita.patient?.email ? (
                    <p className="mt-0.5 text-xs text-neutral-600">—</p>
                  ) : null}
                </div>

                <StatusBadge status={cita.status} />
              </div>

              {cita.status === "cancelled" && cita.cancel_reason ? (
                <p className="mt-2 text-sm text-neutral-500">Motivo: {cita.cancel_reason}</p>
              ) : null}

              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {cancelada ? (
                    <Accion
                      etiqueta="Reabrir"
                      onClick={() => onCambiar(cita.id, "reopen")}
                      disabled={ocupado}
                    />
                  ) : (
                    <>
                      {cita.status === "pending" ? (
                        <Accion
                          etiqueta="Confirmar"
                          onClick={() => onCambiar(cita.id, "confirmed")}
                          disabled={ocupado}
                          destacado
                        />
                      ) : cita.status === "confirmed" ? (
                        <Accion
                          etiqueta="Atendida"
                          onClick={() => onCambiar(cita.id, "completed")}
                          disabled={ocupado}
                          destacado
                        />
                      ) : cita.status === "completed" ? (
                        <Accion
                          etiqueta="Atendida"
                          onClick={() => onCambiar(cita.id, "completed")}
                          disabled
                        />
                      ) : cita.status === "no_show" ? (
                        <Accion
                          etiqueta="Reabrir"
                          onClick={() => onCambiar(cita.id, "reopen")}
                          disabled={ocupado}
                        />
                      ) : null}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            disabled={ocupado}
                            className="inline-flex items-center gap-1 rounded-full border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-all duration-micro ease-out-soft hover:border-neutral-400 hover:bg-neutral-100 hover:scale-[1.03] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                          >
                            <span>Opciones</span>
                            <ChevronDown className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-44">
                          {cita.patient ? (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  open(cita.patient_id, {
                                    start,
                                    end,
                                    serviceName: cita.service?.name ?? null,
                                    status: cita.status,
                                  })
                                }
                                className="cursor-pointer gap-2"
                              >
                                <UserRound className="h-4 w-4 text-neutral-500" />
                                <span>Ver perfil</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          ) : null}
                          {reprogramable(cita) && (
                            <DropdownMenuItem
                              onClick={() => onReagendar(cita)}
                              className="cursor-pointer gap-2"
                            >
                              <CalendarClock className="h-4 w-4 text-neutral-500" />
                              <span>Reagendar</span>
                            </DropdownMenuItem>
                          )}
                          {cita.status !== "no_show" && cita.status !== "completed" && (
                            <DropdownMenuItem
                              onClick={() => onCambiar(cita.id, "no_show")}
                              className="cursor-pointer gap-2"
                            >
                              <UserX className="h-4 w-4 text-neutral-500" />
                              <span>No asistió</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onCambiar(cita.id, "cancelled")}
                            className="cursor-pointer gap-2 text-danger-600 focus:text-danger-700"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Cancelar cita</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
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