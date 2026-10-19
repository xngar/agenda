"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button, inputClasses } from "@/components/ui";

const labelCls = "mb-1 block text-xs font-medium text-neutral-600";

export interface ServiceItem {
  id: string;
  name: string;
  duration_min: number;
  active: boolean;
}

export function ServiceForm({
  edit,
  onCancel,
  bare = false,
}: {
  edit?: ServiceItem | null;
  onCancel?: () => void;
  /** Dentro del modal no lleva tarjeta propia: el diálogo ya es la superficie. */
  bare?: boolean;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const datos = new FormData(form);
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
        toast.error(data.error ?? "No se pudo guardar el servicio");
        return;
      }

      toast.success(edit ? "Servicio actualizado" : "Servicio agregado");
      form.reset();
      onCancel?.();
      router.refresh();
    } catch {
      toast.error("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={guardar}
      className={bare ? "space-y-3" : "space-y-4 rounded-card border border-neutral-200 bg-white p-4"}
    >
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
            className={inputClasses}
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
            className={inputClasses}
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

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={enviando}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : edit ? "Guardar cambios" : "Agregar servicio"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Alta de servicio en modal. El formulario es el mismo que se usa para
 * editar (`ServiceForm`), sólo que sin tarjeta: el diálogo ya es la
 * superficie y así el listado queda como protagonista de la página.
 */
export function ServiceFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.16 }}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-navy-900/40 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-servicio-titulo"
          onClick={onClose}
        >
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 16 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            transition={
              reduceMotion
                ? { duration: 0.12 }
                : { type: "spring", stiffness: 450, damping: 32 }
            }
            className="my-auto w-full max-w-lg rounded-card border border-neutral-200/80 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="dialog-servicio-titulo" className="text-lg font-semibold text-brand-navy">
              Nuevo servicio
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Aparecerá en el asistente de reserva. Los cambios sólo afectan a las reservas
              nuevas, no a las citas ya agendadas.
            </p>

            <div className="mt-4">
              <ServiceForm onCancel={onClose} bare />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function NewServiceButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Nuevo servicio</Button>
      <ServiceFormModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

