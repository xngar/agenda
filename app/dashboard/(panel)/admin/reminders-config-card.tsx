"use client";

import { useId, useState } from "react";
import { BellRing, CheckCircle2 } from "lucide-react";
import { Button, Card, CardHeader, inputClasses } from "@/components/ui";

const HOURS_OPTIONS = [
  { value: 24, label: "24 horas antes (1 día · recomendado)" },
  { value: 48, label: "48 horas antes (2 días)" },
  { value: 72, label: "72 horas antes (3 días)" },
] as const;

export function RemindersConfigCard({
  initialEnabled,
  initialHours,
}: {
  initialEnabled: boolean;
  initialHours: number;
}) {
  const selectId = useId();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [hours, setHours] = useState<number>(
    HOURS_OPTIONS.some((o) => o.value === initialHours) ? initialHours : 24,
  );
  const [savedEnabled, setSavedEnabled] = useState(initialEnabled);
  const [savedHours, setSavedHours] = useState(
    HOURS_OPTIONS.some((o) => o.value === initialHours) ? initialHours : 24,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  const dirty = enabled !== savedEnabled || hours !== savedHours;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSavedMsg(false);
    setPending(true);

    try {
      const response = await fetch("/api/dashboard/reminders-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reminders_enabled: enabled,
          reminder_hours_before: hours,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        reminders_enabled?: boolean;
        reminder_hours_before?: number;
      };

      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar la configuración");
        setPending(false);
        return;
      }

      setSavedEnabled(data.reminders_enabled ?? enabled);
      setSavedHours(data.reminder_hours_before ?? hours);
      setSavedMsg(true);
      setPending(false);
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Recordatorios automáticos a tus pacientes"
        description="Envía un correo automático a tus pacientes con cita confirmada según la anticipación que elijas."
      />
      <form onSubmit={onSubmit} className="space-y-5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-navy-50 text-action-primary">
              <BellRing className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-neutral-800">
                Envío automático por correo electrónico
              </p>
              <p className="text-xs text-neutral-600">
                Incluye fecha, hora, profesional, dirección de la clínica y enlace de gestión.
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Activar recordatorios automáticos por correo"
            onClick={() => {
              setEnabled((prev) => !prev);
              setSavedMsg(false);
            }}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary ${
              enabled ? "bg-action-primary" : "bg-neutral-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <div className="max-w-xs space-y-1.5">
          <label htmlFor={selectId} className="block text-sm font-medium text-neutral-800">
            Anticipación del recordatorio
          </label>
          <select
            id={selectId}
            value={hours}
            disabled={!enabled}
            onChange={(e) => {
              setHours(Number(e.target.value));
              setSavedMsg(false);
            }}
            className={inputClasses}
          >
            {HOURS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <p role="alert" className="text-sm font-medium text-danger-700">
            {error}
          </p>
        ) : null}

        {savedMsg ? (
          <p
            role="status"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-success-700"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Preferencias de recordatorios guardadas.
          </p>
        ) : null}

        <div className="flex items-center justify-end border-t border-neutral-100 pt-4">
          <Button type="submit" disabled={pending || !dirty}>
            {pending ? "Guardando…" : "Guardar preferencias"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

