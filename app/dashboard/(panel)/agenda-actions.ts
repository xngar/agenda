"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { DoctorAppointment } from "@/lib/types";
import { parseAppointmentRange } from "@/lib/range";
import { useRealtimeNotifications } from "../use-realtime";
import type { ReschedulableAppointment } from "./staff-reschedule-modal";
import type { StaffDoctor } from "./staff-booking-button";

/**
 * Acciones de estado de una cita, compartidas por la vista día y la semanal.
 *
 * La fuente de verdad es el servidor: cada cambio hace POST a
 * `/api/dashboard/appointments` y después `router.refresh()`, que también trae
 * lo que hizo otro profesional o el paciente. Por eso las vistas no mantienen
 * estado propio de las citas.
 *
 * Al llegar una notificación por Realtime se refresca con debounce de 1,5 s;
 * el aviso manual queda como respaldo si el refresco automático falla.
 */
export function useAgendaAcciones({
  doctorId,
  orgId,
  doctors,
}: {
  /** Profesional que escucha; null en la vista de todo el equipo. */
  doctorId: string | null;
  /** Organización para escuchar por org cuando no hay filtro de doctor. */
  orgId: string;
  doctors: StaffDoctor[];
}) {
  const router = useRouter();
  const [pendiente, setPendiente] = useState<string | null>(null);
  const [reagendando, setReagendando] = useState<DoctorAppointment | null>(null);
  const [nuevas, setNuevas] = useState(0);
  const [recientes, setRecientes] = useState<string[]>([]);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    };
  }, []);

  const refrescarAhora = useCallback(() => {
    setNuevas(0);
    router.refresh();
  }, [router]);

  const programarRefresco = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      router.refresh();
      setNuevas(0);
    }, 1500);
  }, [router]);

  const { connected, error: realtimeError } = useRealtimeNotifications(
    { doctorId, orgId },
    useCallback(() => {
      setNuevas((n) => n + 1);
      programarRefresco();
    }, [programarRefresco]),
  );

  async function cambiar(appointmentId: string, action: string) {
    setPendiente(appointmentId + action);
    marcarReciente(appointmentId);

    try {
      const response = await fetch("/api/dashboard/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, action }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        toast.error(data.error ?? "No se pudo actualizar la cita");
        return;
      }

      setNuevas(0);
      toast.success("Cita actualizada");
      router.refresh();
    } catch {
      toast.error("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setPendiente(null);
    }
  }

  /**
   * Marca una cita como recién tocada para que su fila se resalte al
   * volver con los datos del servidor. El resaltado dura un par de segundos:
   * suficiente para verlo, sin quedar ahí esperando atención.
   */
  function marcarReciente(appointmentId: string) {
    setRecientes((prev) => (prev.includes(appointmentId) ? prev : [...prev, appointmentId]));

    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => {
      setRecientes((prev) => prev.filter((id) => id !== appointmentId));
    }, 2000);
  }

  const paraReagendar = useCallback(
    (cita: DoctorAppointment): ReschedulableAppointment => {
      const { start } = parseAppointmentRange(cita.during);
      return {
        id: cita.id,
        patientName: cita.patient?.full_name ?? "Paciente",
        currentStart: start,
        doctorId: cita.doctor_id,
        doctorName: doctors.find((d) => d.id === cita.doctor_id)?.full_name ?? "Profesional",
        serviceName: cita.service?.name ?? "Atención",
      };
    },
    [doctors],
  );

  return {
    pendiente,
    cambiar,
    reagendando,
    setReagendando,
    paraReagendar,
    nuevas,
    setNuevas,
    refrescarAhora,
    connected,
    realtimeError,
    recientes,
  };
}

/** Cita activa: se puede confirmar, reprogramar o cancelar. */
export function reprogramable(cita: DoctorAppointment): boolean {
  return cita.status === "pending" || cita.status === "confirmed";
}