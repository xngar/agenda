"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, ErrorNotice, Field, inputClasses } from "@/components/ui";
import { formatTime, todayKey } from "@/lib/dates";
import type { StaffDoctor } from "./staff-booking-button";
import { motion } from "motion/react";

export interface ReschedulableAppointment {
  id: string;
  patientName: string;
  currentStart: string;
  doctorId: string;
  doctorName: string;
  serviceName: string;
}

/**
 * Reprogramar una cita desde la agenda.
 *
 * Elige nuevo día y hora (la duración sale del servicio de la cita) y la
 * mueve conservando paciente, servicio e historial. Avisos por correo al
 * paciente y al profesional los envía el servidor.
 */
export function StaffRescheduleModal({
  appointment,
  doctors,
  defaultDate,
  onClose,
  onDone,
}: {
  appointment: ReschedulableAppointment;
  doctors: StaffDoctor[];
  defaultDate: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [doctorId, setDoctorId] = useState(appointment.doctorId);
  const [date, setDate] = useState(defaultDate);
  const [slots, setSlots] = useState<{ slot_start: string; slot_end: string }[]>([]);
  const [cargando, setCargando] = useState(false);
  const [slotStart, setSlotStart] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargarSlots = useCallback(async () => {
    if (!date) return;
    setCargando(true);
    const params = new URLSearchParams({ appointmentId: appointment.id, date });
    if (doctorId !== appointment.doctorId) params.set("doctorId", doctorId);
    try {
      const res = await fetch(`/api/dashboard/slots?${params.toString()}`);
      const data = (await res.json()) as {
        slots?: { slot_start: string; slot_end: string }[];
        error?: string;
      };
      setSlots(data.slots ?? []);
      setSlotStart("");
      if (data.error) setError(data.error);
    } catch {
      setSlots([]);
    } finally {
      setCargando(false);
    }
  }, [appointment.id, appointment.doctorId, date, doctorId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch de slots al cambiar día/profesional, setState tras await
    cargarSlots();
  }, [cargarSlots]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!slotStart || guardando) return;
    setError(null);
    setGuardando(true);
    try {
      const res = await fetch("/api/dashboard/appointments/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment.id,
          slotStart,
          doctorId: doctorId !== appointment.doctorId ? doctorId : null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo reprogramar la cita");
        if (data.code === "A0001" || data.code === "A0002") cargarSlots();
        return;
      }
      toast.success(`Cita de ${appointment.patientName} reprogramada`);
      onDone();
      router.refresh();
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  const label = "mb-1 block text-xs font-medium text-neutral-600";
  const doctor = doctors.find((d) => d.id === doctorId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-navy-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Reprogramar cita"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 450, damping: 32 }}
        className="w-full max-w-lg rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-brand-navy">Reprogramar cita</h2>
        <p className="mt-1 text-sm text-neutral-600">
          {appointment.patientName} · {appointment.serviceName} · con{" "}
          {doctor?.full_name ?? appointment.doctorName}
        </p>

        <form onSubmit={guardar} className="mt-4 space-y-4">
          {error ? <ErrorNotice message={error} /> : null}

          {doctors.length > 1 ? (
            <Field label="Profesional" htmlFor="reagendar-doctor" required={false}>
              <select
                id="reagendar-doctor"
                className={inputClasses}
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <Field label="Nuevo día" htmlFor="reagendar-fecha" required={false}>
            <input
              id="reagendar-fecha"
              type="date"
              className={inputClasses}
              value={date}
              min={todayKey()}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>

          <div>
            <span className={label}>Nueva hora</span>
            {!date ? (
              <p className="text-sm text-neutral-500">Elige el nuevo día.</p>
            ) : cargando ? (
              <p className="text-sm text-neutral-500">Cargando horas…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Sin horas libres ese día. Prueba con otro día o profesional.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Horas disponibles">
                {slots.map((s) => (
                  <button
                    key={s.slot_start}
                    type="button"
                    aria-pressed={slotStart === s.slot_start}
                    onClick={() => setSlotStart(s.slot_start)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-semibold tabular-nums transition-all duration-150 ease-out active:scale-95 cursor-pointer ${
                      slotStart === s.slot_start
                        ? "border-brand-navy bg-brand-navy text-white shadow-xs scale-[1.03]"
                        : "border-neutral-300 bg-white text-neutral-700 hover:border-brand-navy hover:text-brand-navy hover:shadow-2xs"
                    }`}
                  >
                    {formatTime(s.slot_start)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!slotStart || guardando}>
              {guardando ? "Moviendo…" : "Mover cita"}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
