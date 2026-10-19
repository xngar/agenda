"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, buttonClasses, inputClasses } from "@/components/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { AsyncButton } from "@/components/motion/async-button";
import { Modal } from "@/components/motion/modal";

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
        <Checkbox
          id="servicio-activo"
          name="active"
          defaultChecked={edit ? edit.active : true}
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
        <AsyncButton
          type="submit"
          loading={enviando}
          pendingLabel="Guardando servicio"
          className={buttonClasses("primary", "md")}
        >
          {edit ? "Guardar cambios" : "Agregar servicio"}
        </AsyncButton>
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
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo servicio"
      description="Aparecerá en el asistente de reserva. Los cambios sólo afectan a las reservas nuevas, no a las citas ya agendadas."
    >
      <div className="mt-4">
        <ServiceForm onCancel={onClose} bare />
      </div>
    </Modal>
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

