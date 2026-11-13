"use client";

import { Mail, ChevronDown, CalendarClock, UserX, XCircle, UserRound } from "lucide-react";
import type { DoctorAppointment } from "@/lib/types";
import { formatTime } from "@/lib/dates";
import { StatusBadge } from "@/components/ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TruncatedText } from "@/components/ui/truncated-text";
import { WhatsappButton } from "@/components/dashboard/whatsapp-button";
import { parseAppointmentRange } from "@/lib/range";
import { resaltarCita } from "./resaltar-cita";
import { usePatientQuickView } from "@/components/dashboard/patient-quick-view";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Riel y fondo por estado. Misma historia de color que `CHIP_TONO` en
 * month-view (navy = confirmada, celeste = por confirmar o atendida,
 * gris = cancelada, rojo = no asistió) para que día y mes se lean como la
 * misma agenda.
 */
export const RIEL: Record<string, string> = {
  confirmed: "border-l-brand-navy bg-white",
  pending: "border-l-brand-sky-400 bg-brand-sky-50",
  cancelled: "border-l-neutral-300 bg-white",
  completed: "border-l-brand-sky-600 bg-brand-sky-50",
  no_show: "border-l-danger-600 bg-white",
};

const PUNTO: Record<string, string> = {
  confirmed: "bg-brand-navy",
  pending: "bg-brand-sky-400",
  cancelled: "bg-neutral-300",
  completed: "bg-brand-sky-600",
  no_show: "bg-danger-600",
};

export function Accion({
  etiqueta,
  onClick,
  disabled,
  tono,
  destacado,
  compacto,
}: {
  etiqueta: string;
  onClick: () => void;
  disabled?: boolean;
  tono?: "peligro";
  destacado?: boolean;
  compacto?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border font-medium transition-all duration-micro ease-out-soft hover:scale-[1.03] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 ${
        compacto ? "px-2.5 py-1 text-[13px]" : "px-3 py-1.5 text-sm"
      } ${
        destacado
          ? "border-action-primary bg-action-primary text-action-primary-foreground shadow-2xs hover:bg-action-primary-hover hover:shadow-xs"
          : tono === "peligro"
            ? "border-danger-200 text-danger-700 hover:bg-danger-50 hover:border-danger-300"
            : "border-neutral-300 text-neutral-700 hover:bg-neutral-100 hover:border-neutral-400"
      }`}
    >
      {etiqueta}
    </button>
  );
}

/**
 * Tabla compacta de la agenda del día (desktop).
 *
 * Componente presentacional: no hace fetch ni conoce el router. Recibe las
 * citas ya filtradas y delega las acciones en `onAccion`, para que la
 * tarjeta móvil y la tabla compartan la misma lógica de estado que vive
 * en `agenda.tsx` (fuente de verdad: el servidor vía `router.refresh()`).
 *
 * Las filas entran con un escalonado corto (35 ms) y solo las primeras
 * visibles: una tabla de 60 citas no debe tardar dos segundos en aparecer.
 * Las filas recién tocadas se resaltan y el resaltado se apaga solo.
 */
export function AgendaTable({
  citas,
  pendiente,
  onAccion,
  orgName,
  recientes = [],
}: {
  citas: DoctorAppointment[];
  pendiente: string | null;
  onAccion: (appointmentId: string, action: string) => void;
  orgName: string;
  /** Ids de las citas recién modificadas: se resaltan al instante. */
  recientes?: string[];
}) {
  const { open, prefetch } = usePatientQuickView();

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-neutral-600">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-3 rounded-full bg-success-600" />
          Reagendada
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-3 rounded-full bg-brand-sky-600" />
          Atendida
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-3 rounded-full bg-danger-600" />
          Cancelada / No asistió
        </span>
      </div>
      <div className="overflow-x-auto rounded-card bg-white shadow-card">
        <table className="w-full min-w-[760px] text-sm" data-testid="agenda-table">
          <caption className="sr-only">Citas del día</caption>
          <thead className="border-b border-neutral-100 bg-neutral-50/60">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500"
              >
                Hora
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500"
              >
                Paciente
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500"
              >
                Servicio / Contacto
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500"
              >
                Estado
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {citas.map((cita, indice) => {
              const { start, end } = parseAppointmentRange(cita.during);
              const cancelada = cita.status === "cancelled";
              const ocupado = pendiente?.startsWith(cita.id) ?? false;
              const recien = recientes.includes(cita.id);
              const resaltar = resaltarCita(cita);

              return (
                <tr
                  key={cita.id}
                  className={`anim-row-in transition-colors duration-micro ease-out-soft ${
                    resaltar ? resaltar.fondo : "hover:bg-action-primary/5"
                  } ${
                    cancelada ? "opacity-70" : ""
                  } ${recien ? "row-highlight" : ""}`}
                  style={{ animationDelay: `${Math.min(indice, 12) * 35}ms` }}
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className={`inline-block size-2 shrink-0 rounded-full ${PUNTO[cita.status] ?? "bg-neutral-300"}`}
                      />
                      <span>
                        <span className="block font-semibold tabular-nums text-action-primary">
                          {formatTime(start)}
                        </span>
                        <span className="block text-xs tabular-nums text-neutral-600">
                          {formatTime(end)}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-neutral-900">
                        {cita.patient?.full_name ?? "Paciente"}
                      </p>
                      {cita.patient ? (
                        <button
                          type="button"
                          onClick={() =>
                            open(cita.patient_id, {
                              start,
                              end,
                              serviceName: cita.service?.name ?? null,
                              status: cita.status,
                              patient: cita.patient,
                            })
                          }
                          onMouseEnter={() => prefetch(cita.patient_id)}
                          onFocus={() => prefetch(cita.patient_id)}
                          aria-label={`Ver perfil de ${cita.patient.full_name}`}
                          title="Ver perfil del paciente"
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-action-primary/10 hover:text-action-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary"
                        >
                          <UserRound className="size-4" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                    {cita.patient?.rut ? (
                      <p className="mt-0.5 text-xs tabular-nums text-neutral-500">
                        {cita.patient.rut}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <p className="max-w-56 text-neutral-800">{cita.service?.name ?? "—"}</p>
                    {cita.patient?.phone || cita.patient?.email ? (
                      <div className="mt-0.5 space-y-0.5 text-xs text-neutral-500">
                        {cita.patient?.phone ? (
                          <TruncatedText text={cita.patient.phone} className="max-w-56" />
                        ) : null}
                        {cita.patient?.email ? (
                          <TruncatedText text={cita.patient.email} className="max-w-56" />
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-0.5 text-xs text-neutral-500">—</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={cita.status} />
                    {cita.status === "cancelled" && cita.cancel_reason ? (
                      <div className="mt-1 max-w-44">
                        <TruncatedText
                          text={`Motivo: ${cita.cancel_reason}`}
                          className="max-w-44 text-xs text-neutral-500"
                        />
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center justify-end gap-1.5 flex-nowrap">
                      {cancelada ? (
                        <Accion
                          etiqueta="Reabrir"
                          onClick={() => onAccion(cita.id, "reopen")}
                          disabled={ocupado}
                          compacto
                        />
                      ) : (
                        <>
                          {cita.status === "pending" ? (
                            <Accion
                              etiqueta="Confirmar"
                              onClick={() => onAccion(cita.id, "confirmed")}
                              disabled={ocupado}
                              destacado
                              compacto
                            />
                          ) : cita.status === "confirmed" ? (
                            <Accion
                              etiqueta="Atendida"
                              onClick={() => onAccion(cita.id, "completed")}
                              disabled={ocupado}
                              destacado
                              compacto
                            />
                          ) : cita.status === "completed" ? (
                            <Accion
                              etiqueta="Atendida"
                              onClick={() => onAccion(cita.id, "completed")}
                              disabled
                              compacto
                            />
                          ) : cita.status === "no_show" ? (
                            <Accion
                              etiqueta="Reabrir"
                              onClick={() => onAccion(cita.id, "reopen")}
                              disabled={ocupado}
                              compacto
                            />
                          ) : null}

                          {cita.status === "pending" || cita.status === "confirmed" ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex">
                                  <button
                                    type="button"
                                    onClick={() => onAccion(cita.id, "remind")}
                                    disabled={ocupado || !cita.patient?.email}
                                    aria-label={
                                      cita.patient?.email
                                        ? `Enviar recordatorio a ${cita.patient.full_name}`
                                        : `Sin correo registrado para ${cita.patient?.full_name ?? "el paciente"}`
                                    }
                                    className="inline-flex items-center gap-1 rounded-full border border-neutral-300 px-2.5 py-1 text-[13px] font-medium text-neutral-700 transition-all duration-micro ease-out-soft hover:scale-[1.03] hover:border-action-primary/40 hover:bg-action-primary/5 hover:text-action-primary active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                                  >
                                    <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span>Recordatorio</span>
                                  </button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {cita.patient?.email
                                  ? "Enviar recordatorio por correo"
                                  : "Sin correo registrado"}
                              </TooltipContent>
                            </Tooltip>
                          ) : null}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                disabled={ocupado}
                                className="inline-flex items-center gap-1 rounded-full border border-neutral-300 px-2.5 py-1 text-[13px] font-medium text-neutral-700 transition-all duration-micro ease-out-soft hover:border-neutral-400 hover:bg-neutral-100 hover:scale-[1.03] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                              >
                                <span>Opciones</span>
                                <ChevronDown className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              {cita.patient ? (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      open(cita.patient_id, {
                                        start,
                                        end,
                                        serviceName: cita.service?.name ?? null,
                                        status: cita.status,
                                        patient: cita.patient,
                                      })
                                    }
                                    onMouseEnter={() => prefetch(cita.patient_id)}
                                    onFocus={() => prefetch(cita.patient_id)}
                                    className="cursor-pointer gap-2"
                                  >
                                    <UserRound className="h-4 w-4 text-neutral-500" />
                                    <span>Ver perfil</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              ) : null}
                              {(cita.status === "pending" || cita.status === "confirmed") && (
                                <DropdownMenuItem
                                  onClick={() => onAccion(cita.id, "reschedule")}
                                  className="cursor-pointer gap-2"
                                >
                                  <CalendarClock className="h-4 w-4 text-neutral-500" />
                                  <span>Reagendar</span>
                                </DropdownMenuItem>
                              )}
                              {cita.status !== "no_show" && cita.status !== "completed" && (
                                <DropdownMenuItem
                                  onClick={() => onAccion(cita.id, "no_show")}
                                  className="cursor-pointer gap-2"
                                >
                                  <UserX className="h-4 w-4 text-neutral-500" />
                                  <span>No asistió</span>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => onAccion(cita.id, "cancelled")}
                                className="cursor-pointer gap-2 text-danger-600 focus:text-danger-700"
                              >
                                <XCircle className="h-4 w-4" />
                                <span>Cancelar cita</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                      <WhatsappButton
                        patientId={cita.patient_id}
                        fullName={cita.patient?.full_name ?? "Paciente"}
                        phone={cita.patient?.phone ?? null}
                        orgName={orgName}
                        compacto
                        disabled={ocupado}
                      />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
