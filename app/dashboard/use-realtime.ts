"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

/**
 * Suscripción Realtime a las notificaciones de un profesional.
 *
 * Los eventos también pasan por RLS, así que cada sesión recibe
 * únicamente las suyas. Se usa el cliente SSR (`createBrowserClient`),
 * no `createClient`: Realtime autentica el canal con la sesión que
 * tenga en cookies.
 */
export function useRealtimeNotifications(
  doctorId: string | undefined,
  onInsert: (payload: NotificationRow) => void,
): { connected: boolean; error: string | null } {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !doctorId) return;

    const channel = supabase
      .channel(`notifications:${doctorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `doctor_id=eq.${doctorId}`,
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
  }, [supabase, doctorId, onInsert]);

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