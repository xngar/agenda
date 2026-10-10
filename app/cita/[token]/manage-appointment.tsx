"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import type { Holiday, PatientAppointmentView, SlotWithDoctor } from "@/lib/types";
import { CLINIC_ADDRESS, CLINIC_PHONE } from "@/lib/clinic";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorNotice,
  InfoNotice,
  LoadingPanel,
  StatusBadge,
  buttonClasses,
} from "@/components/ui";
import WeekdayPicker from "@/components/booking/weekday-picker";
import { formatDateLong, formatRange } from "@/lib/dates";

type Mode = "view" | "reschedule" | "cancel";

interface Props {
  token: string;
  appointment: PatientAppointmentView;
  canModify: boolean;
  holidays: Holiday[];
  minNoticeHours: number;
  maxDaysAhead: number;
}

export default function ManageAppointment({
  token,
  appointment: initial,
  canModify: initialCanModify,
  holidays,
  minNoticeHours,
  maxDaysAhead,
}: Props) {
  const [appointment, setAppointment] = useState(initial);
  const [canModify, setCanModify] = useState(initialCanModify);
  const [mode, setMode] = useState<Mode>("view");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Estado de reprogramación.
  const [day, setDay] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotWithDoctor[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [newSlot, setNewSlot] = useState<string | null>(null);
  const [newDoctorId, setNewDoctorId] = useState<string | null>(null);

  // Estado de cancelación.
  const [reason, setReason] = useState("");

  const loadSlots = useCallback(
    async (dayKey: string) => {
      if (!appointment.serviceId) return;
      setSlotsLoading(true);
      setSlotsError(null);
      setNewSlot(null);

      try {
        const params = new URLSearchParams({
          clinicSlug: appointment.clinicSlug,
          date: dayKey,
          serviceId: appointment.serviceId,
          doctorId: appointment.doctorId,
        });
        const response = await fetch(`/api/slots?${params.toString()}`, {
          headers: { Accept: "application/json" },
        });
        const data = (await response.json()) as { slots?: SlotWithDoctor[]; error?: string };

        if (!response.ok) {
          setSlotsError(data.error ?? "No pudimos cargar los horarios.");
          return;
        }
        setSlots(data.slots ?? []);
      } catch {
        setSlotsError("No pudimos conectar. Revisa tu internet e intenta de nuevo.");
      } finally {
        setSlotsLoading(false);
      }
    },
    [appointment.serviceId, appointment.doctorId, appointment.clinicSlug],
  );

  const slotsByStart = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const slot of slots) {
      const list = map.get(slot.slot_start) ?? [];
      list.push(slot.doctor_id);
      map.set(slot.slot_start, list);
    }
    return map;
  }, [slots]);

  async function post(action: "reschedule" | "cancel", body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/manage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-action": action,
        },
        body: JSON.stringify({ token, ...body }),
      });

      const data = (await response.json()) as {
        appointment?: PatientAppointmentView;
        error?: string;
      };

      if (!response.ok || !data.appointment) {
        setError(data.error ?? "No pudimos completar la operación.");
        return false;
      }

      setAppointment(data.appointment);
      setCanModify(data.appointment.canModify);
      return true;
    } catch {
      setError("No pudimos conectar con el servidor. Intenta en unos minutos.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function confirmReschedule() {
    if (!newSlot) return;
    const ok = await post("reschedule", { slotStart: newSlot, doctorId: newDoctorId });
    if (ok) {
      setMode("view");
      setDay(null);
      setSlots([]);
      setNotice("Tu cita fue reprogramada. Te enviamos un correo con el nuevo detalle.");
    }
  }

  async function confirmCancel() {
    const ok = await post("cancel", { reason: reason.trim() || undefined });
    if (ok) {
      setMode("view");
      setReason("");
      setNotice("Tu cita fue cancelada.");
    }
  }

  const dateLabel = formatDateLong(appointment.startsAt, appointment.clinicTimezone);
  const timeLabel = formatRange(appointment.startsAt, appointment.endsAt, appointment.clinicTimezone);

  // Datos de contacto de la organización de la cita: si faltan, caemos a las
  // constantes por compatibilidad con organizaciones antiguas.
  const address = appointment.clinicAddress ?? CLINIC_ADDRESS;
  const phone = appointment.clinicPhone ?? CLINIC_PHONE;
  const reservarHref = appointment.clinicSlug ? `/${appointment.clinicSlug}/reservar` : "/reservar";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-brand-navy sm:text-3xl">Tu cita</h1>
        <StatusBadge status={appointment.status} />
      </div>
      <p className="mt-1.5 text-sm text-neutral-600">
        Hola {appointment.patientName.split(" ")[0]}, revisa el detalle de tu atención.
      </p>

      {error ? (
        <div className="mt-5">
          <ErrorNotice message={error} />
        </div>
      ) : null}
      {notice ? (
        <div className="mt-5">
          <InfoNotice>{notice}</InfoNotice>
        </div>
      ) : null}

      <Card className="mt-6 p-5 sm:p-6">
        <dl className="space-y-3">
          <Row label="Fecha" value={dateLabel} />
          <Row label="Hora" value={timeLabel} />
          <Row
            label="Profesional"
            value={
              appointment.specialty
                ? `${appointment.doctorName} · ${appointment.specialty}`
                : appointment.doctorName
            }
          />
          <Row label="Servicio" value={appointment.serviceName} />
          <Row label="Lugar" value={address} />
        </dl>

        {appointment.status === "cancelled" ? (
          <div className="mt-5 rounded-card bg-neutral-100 p-4">
            <p className="text-sm font-semibold text-neutral-800">Cita cancelada</p>
            <p className="mt-1 text-sm text-neutral-600">
              {appointment.cancelledBy === "doctor"
                ? "La clínica canceló esta cita. Si no te contactamos, puedes reservar una nueva."
                : "Puedes reservar una nueva hora cuando quieras."}
            </p>
            {appointment.cancelReason ? (
              <p className="mt-1.5 text-sm text-neutral-600">Motivo: {appointment.cancelReason}</p>
            ) : null}
          </div>
        ) : null}

        {canModify && mode === "view" ? (
          <div className="mt-6 flex flex-col gap-2.5 border-t border-neutral-200 pt-5 sm:flex-row">
            <Button variant="primary" onClick={() => setMode("reschedule")} disabled={busy}>
              Reprogramar
            </Button>
            <Button variant="secondary" onClick={() => setMode("cancel")} disabled={busy}>
              Cancelar cita
            </Button>
          </div>
        ) : null}

        {!canModify && appointment.status !== "cancelled" ? (
          <p className="mt-5 border-t border-neutral-200 pt-5 text-sm text-neutral-600">
            Esta cita ya no se puede modificar por internet. Si necesitas cambios, llámanos al{" "}
            <a href={`tel:${CLINIC_PHONE.replace(/\s/g, "")}`} className="font-semibold text-brand-navy">
              {CLINIC_PHONE}
            </a>
            .
          </p>
        ) : null}
      </Card>

      {mode === "reschedule" ? (
        <Card className="mt-6">
          <CardHeader
            title="Elige una nueva fecha y hora"
            description={`Mismo servicio (${appointment.serviceName}) y mismo profesional (${appointment.doctorName}).`}
            action={
              <button
                type="button"
                onClick={() => setMode("view")}
                className="text-sm font-semibold text-brand-navy underline underline-offset-4"
              >
                Volver
              </button>
            }
          />
          <div className="space-y-5 p-5">
            <WeekdayPicker
              holidays={holidays}
              maxDaysAhead={maxDaysAhead}
              minNoticeHours={minNoticeHours}
              selected={day}
              statuses={{}}
              onSelect={(dayKey) => {
                setDay(dayKey);
                void loadSlots(dayKey);
              }}
            />

            {!day ? (
              <EmptyState
                title="Elige un día"
                description="Te mostramos las horas libres de este profesional."
              />
            ) : slotsLoading ? (
              <LoadingPanel label="Buscando horarios…" />
            ) : slotsError ? (
              <ErrorNotice message={slotsError} />
            ) : slots.length === 0 ? (
              <EmptyState
                title="No hay horas ese día"
                description="Prueba con otra fecha."
              />
            ) : (
              <fieldset>
                <legend className="mb-2.5 text-sm font-medium text-neutral-800">
                  Horarios disponibles
                </legend>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {[...slotsByStart.entries()].map(([start, doctorIds]) => (
                    <button
                      key={start}
                      type="button"
                      aria-pressed={newSlot === start}
                      onClick={() => {
                        setNewSlot(start);
                        setNewDoctorId(doctorIds.length === 1 ? doctorIds[0]! : null);
                      }}
                      className={`min-h-11 rounded-xl border text-sm font-semibold transition-colors ${
                        newSlot === start
                          ? "border-brand-navy bg-brand-navy text-white"
                          : "border-neutral-300 bg-white text-brand-navy hover:border-brand-navy hover:bg-brand-navy-50"
                      }`}
                    >
                      {new Intl.DateTimeFormat("es-CL", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                        timeZone: appointment.clinicTimezone,
                      }).format(new Date(start))}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="flex flex-col-reverse gap-2.5 border-t border-neutral-200 pt-5 sm:flex-row sm:justify-between">
              <Button variant="ghost" onClick={() => setMode("view")} type="button">
                Volver
              </Button>
              <Button
                variant="primary"
                onClick={() => void confirmReschedule()}
                disabled={!newSlot || busy}
                type="button"
              >
                {busy ? "Guardando…" : "Confirmar reprogramación"}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {mode === "cancel" ? (
        <Card className="mt-6">
          <CardHeader
            title="¿Cancelar la cita?"
            description="Si la cancelas, la hora queda disponible para otros pacientes."
            action={
              <button
                type="button"
                onClick={() => setMode("view")}
                className="text-sm font-semibold text-brand-navy underline underline-offset-4"
              >
                Volver
              </button>
            }
          />
          <div className="space-y-5 p-5">
            <div>
              <label htmlFor="motivo" className="block text-sm font-medium text-neutral-800">
                Motivo (opcional)
              </label>
              <textarea
                id="motivo"
                name="motivo"
                rows={3}
                maxLength={300}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-navy focus:outline-2 focus:outline-offset-0 focus:outline-brand-navy"
                placeholder="Por ejemplo: me es imposible asistir."
              />
            </div>

            <div className="flex flex-col-reverse gap-2.5 border-t border-neutral-200 pt-5 sm:flex-row sm:justify-between">
              <Button variant="ghost" onClick={() => setMode("view")} type="button">
                Mejor no cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => void confirmCancel()}
                disabled={busy}
                type="button"
              >
                {busy ? "Cancelando…" : "Sí, cancelar cita"}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="mt-8 text-center">
        <Link href="/reservar" className={buttonClasses("secondary", "sm")}>
          Reservar otra hora
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="text-sm font-medium text-neutral-600 sm:w-28 sm:shrink-0">{label}</dt>
      <dd className="text-sm font-medium capitalize text-neutral-900">{value}</dd>
    </div>
  );
}
