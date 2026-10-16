"use client";

import type { DoctorAppointment } from "@/lib/types";
import { formatTime } from "@/lib/dates";
import { StatusBadge } from "@/components/ui";
import { parseAppointmentRange } from "@/lib/range";

/**
 * Riel y fondo por estado. Misma historia de color que `CHIP_TONO` en
 * month-view (navy = confirmada, celeste = por confirmar, gris = cancelada)
 * para que día y mes se lean como la misma agenda.
 */
export const RIEL: Record<string, string> = {
  confirmed: "border-l-brand-navy bg-white",
  pending: "border-l-brand-sky-400 bg-brand-sky-50",
  cancelled: "border-l-neutral-300 bg-white",
  completed: "border-l-brand-navy-300 bg-white",
  no_show: "border-l-red-400 bg-white",
};

const PUNTO: Record<string, string> = {
  confirmed: "bg-brand-navy",
  pending: "bg-brand-sky-400",
  cancelled: "bg-neutral-300",
  completed: "bg-brand-navy-300",
  no_show: "bg-red-400",
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
      className={`rounded-lg border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        compacto ? "px-2.5 py-1 text-[13px]" : "px-3 py-1.5 text-sm"
      } ${
        destacado
          ? "border-brand-navy bg-brand-navy text-white hover:bg-brand-navy/90"
          : tono === "peligro"
            ? "border-red-300 text-red-700 hover:bg-red-50"
            : "border-neutral-300 text-neutral-700 hover:bg-neutral-100"
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
 */
export function AgendaTable({
  citas,
  pendiente,
  onAccion,
}: {
  citas: DoctorAppointment[];
  pendiente: string | null;
  onAccion: (appointmentId: string, action: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
      <table className="w-full min-w-[760px] text-sm" data-testid="agenda-table">
        <caption className="sr-only">Citas del día</caption>
        <thead className="border-b border-neutral-200 bg-neutral-50">
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
          {citas.map((cita) => {
            const { start, end } = parseAppointmentRange(cita.during);
            const cancelada = cita.status === "cancelled";
            const ocupado = pendiente?.startsWith(cita.id) ?? false;

            return (
              <tr
                key={cita.id}
                className={`transition-colors hover:bg-brand-sky-50 ${cancelada ? "opacity-70" : ""}`}
              >
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={`inline-block size-2 shrink-0 rounded-full ${PUNTO[cita.status] ?? "bg-neutral-300"}`}
                    />
                    <span>
                      <span className="block font-semibold tabular-nums text-brand-navy">
                        {formatTime(start)}
                      </span>
                      <span className="block text-xs tabular-nums text-neutral-600">
                        {formatTime(end)}
                      </span>
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-neutral-900">
                    {cita.patient?.full_name ?? "Paciente"}
                  </p>
                  {cita.patient?.rut ? (
                    <p className="mt-0.5 text-xs tabular-nums text-neutral-500">
                      {cita.patient.rut}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <p className="text-neutral-800">{cita.service?.name ?? "—"}</p>
                  <p className="mt-0.5 max-w-56 truncate text-xs text-neutral-500">
                    {[cita.patient?.phone, cita.patient?.email].filter(Boolean).join(" · ") ||
                      "—"}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusBadge status={cita.status} />
                  {cita.status === "cancelled" && cita.cancel_reason ? (
                    <p className="mt-1 max-w-44 truncate text-xs text-neutral-500">
                      Motivo: {cita.cancel_reason}
                    </p>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <span className="inline-flex flex-wrap justify-end gap-1.5">
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
                        ) : null}
                        <Accion
                          etiqueta="Completar"
                          onClick={() => onAccion(cita.id, "completed")}
                          disabled={ocupado}
                          compacto
                        />
                        <Accion
                          etiqueta="No asistió"
                          onClick={() => onAccion(cita.id, "no_show")}
                          disabled={ocupado}
                          compacto
                        />
                        {cita.status === "pending" || cita.status === "confirmed" ? (
                          <Accion
                            etiqueta="Reagendar"
                            onClick={() => onAccion(cita.id, "reschedule")}
                            disabled={ocupado}
                            compacto
                          />
                        ) : null}
                        <Accion
                          etiqueta="Cancelar"
                          onClick={() => onAccion(cita.id, "cancelled")}
                          disabled={ocupado}
                          tono="peligro"
                          compacto
                        />
                      </>
                    )}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
