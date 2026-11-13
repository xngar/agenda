"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { todayKey } from "@/lib/dates";

export interface DraftEncounterOption {
  id: string;
  started_at: string;
  care_type: string | null;
  doctors?: { full_name: string } | null;
}

export function useDraftEncounters(patientId: string) {
  const [encounters, setEncounters] = useState<DraftEncounterOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/ficha/patients/${patientId}/encounters?status=draft&mine=1`,
      );
      const data = (await response.json()) as {
        encounters?: DraftEncounterOption[];
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "No se pudieron cargar las atenciones en borrador");
        setEncounters([]);
        return;
      }
      setEncounters(data.encounters ?? []);
    } catch {
      setError("No pudimos cargar las atenciones en borrador.");
      setEncounters([]);
    }
  }, [patientId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, setState tras await
    void cargar();
  }, [cargar]);

  const crear = useCallback(async (): Promise<DraftEncounterOption | null> => {
    setCreando(true);
    setError(null);
    try {
      const response = await fetch(`/api/ficha/patients/${patientId}/encounters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ started_at: todayKey() }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        encounter?: DraftEncounterOption;
        error?: string;
      };
      if (!response.ok || !data.encounter) {
        setError(data.error ?? "No se pudo crear la atención en borrador");
        return null;
      }
      setEncounters((prev) => [data.encounter!, ...(prev ?? [])]);
      toast.success("Atención en borrador creada");
      return data.encounter;
    } catch {
      setError("No pudimos crear la atención en borrador.");
      return null;
    } finally {
      setCreando(false);
    }
  }, [patientId]);

  return { encounters, error, creando, cargar, crear };
}
