"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const inputCls =
  "w-full min-h-11 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-brand-navy focus:outline-none";
const labelCls = "block text-sm font-medium text-neutral-700";
const primaryBtn =
  "inline-flex min-h-9 items-center rounded-xl bg-brand-navy px-4 text-sm font-semibold text-white hover:bg-brand-navy-700 disabled:cursor-not-allowed disabled:opacity-60";
const ghostBtn =
  "inline-flex min-h-9 items-center rounded-xl border border-neutral-300 px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-100";

export interface ServiceItem {
  id: string;
  name: string;
  duration_min: number;
  active: boolean;
}

export function ServiceForm({
  edit,
  onCancel,
}: {
  edit?: ServiceItem | null;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const datos = new FormData(form);
    setError(null);
    setEnviando(true);

    try {
      const payload: Record<string, unknown> = {
        name: datos.get("name"),
        durationMin: Number(datos.get("durationMin")),
        active: datos.get("active") === "on",
      };

      const url = "/api/dashboard/services";
      const method = edit ? "PATCH" : "POST";

      if (edit) {
        payload.serviceId = edit.id;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar el servicio");
        return;
      }

      form.reset();
      onCancel();
      router.refresh();
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4">
      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="servicio-nombre">
            Nombre del servicio
          </label>
          <input
            id="servicio-nombre"
            name="name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={edit?.name ?? ""}
            className={`${inputCls} mt-1`}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="servicio-duracion">
            Duración (minutos)
          </label>
          <input
            id="servicio-duracion"
            name="durationMin"
            type="number"
            inputMode="numeric"
            required
            min={5}
            max={480}
            defaultValue={edit?.duration_min ?? 30}
            className={`${inputCls} mt-1`}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="servicio-activo"
          name="active"
          type="checkbox"
          defaultChecked={edit ? edit.active : true}
          className="size-4 rounded border-neutral-300 text-brand-navy focus:ring-brand-navy"
        />
        <label htmlFor="servicio-activo" className="text-sm text-neutral-700">
          Servicio activo (visible en el asistente de reserva)
        </label>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={ghostBtn} onClick={onCancel} disabled={enviando}>
          Cancelar
        </button>
        <button type="submit" className={primaryBtn} disabled={enviando}>
          {enviando ? "Guardando..." : edit ? "Guardar cambios" : "Agregar servicio"}
        </button>
      </div>
    </form>
  );
}
