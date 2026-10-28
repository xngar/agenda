"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

/**
 * Suscripción Realtime a las notificaciones del panel.
 *
 * Con `doctorId` la sesión escucha las notificaciones de un profesional
 * (agenda propia o el profesional elegido en la vista de equipo). Sin
 * `doctorId` escucha por organización: es la vista de todo el equipo de
 * admin/recepción, donde el evento de una cancelación llega con el
 * doctor_id del profesional dueño, no de quien mira la agenda.
 *
 * Los eventos también pasan por RLS, así que cada sesión recibe únicamente
 * lo que puede leer. Se usa el cliente SSR (`createBrowserClient`), no
 * `createClient`: Realtime autentica el canal con la sesión que tenga en
 * cookies.
 */
export function useRealtimeNotifications(
  { doctorId, orgId }: { doctorId?: string | null; orgId?: string | null },
  onInsert: (payload: NotificationRow) => void,
): { connected: boolean; error: string | null } {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || (!doctorId && !orgId)) return;

    const canalName = doctorId ?? `org:${orgId}`;
    const channel = supabase
      .channel(`notifications:${canalName}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: doctorId ? `doctor_id=eq.${doctorId}` : `org_id=eq.${orgId}`,
        },
        (payload: { new: unknown }) => {
          const row = payload.new as NotificationRow;
          if (row) onInsert(row);
        },
      )
      .subscribe((status: string) => {
        setConnected(status === "SUBSCRIBED");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setError("Sin conexión en tiempo real");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, doctorId, orgId, onInsert]);

  return { connected, error };
}

export interface NotificationRow {
  id: string;
  doctor_id: string;
  appointment_id: string | null;
  type: "new_booking" | "rescheduled" | "cancelled";
  read_at: string | null;
  created_at: string;
}
