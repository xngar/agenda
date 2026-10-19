"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, buttonClasses, inputClasses } from "@/components/ui";
import { AsyncButton } from "@/components/motion/async-button";
import { Modal } from "@/components/motion/modal";
import { Checkbox } from "@/components/ui/checkbox";

const labelCls = "mb-1 block text-xs font-medium text-neutral-600";

/**
 * Alta de miembros del equipo, sólo visible para administradores.
 *
 * La cuenta nace con contraseña temporal (igual que el administrador que
 * crea la organización desde la plataforma): la comparte la persona que
 * administra por un canal seguro, y la nueva puede cambiarla después.
 * El servidor fija `org_id` desde la sesión, nunca desde este formulario.
 *
 * Va en un modal y no en una tarjeta dentro de la página: el alta es una
 * acción puntual y el listado del equipo tiene que quedar como protagonista.
 */
export function AddMemberModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [rol, setRol] = useState<"professional" | "reception">("professional");

  /* eslint-disable react-hooks/set-state-in-effect -- resincroniza el formulario al abrir */
  useEffect(() => {
    if (open) setRol("professional");
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function crear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const datos = new FormData(event.currentTarget);

    setEnviando(true);

    try {
      const response = await fetch("/api/dashboard/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: datos.get("fullName"),
          email: datos.get("email"),
          password: datos.get("password"),
          specialty: datos.get("specialty") || undefined,
          role: datos.get("role"),
          isAdmin: datos.get("isAdmin") === "on",
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        doctor?: { full_name?: string };
      };

      if (!response.ok) {
        toast.error(data.error ?? "No se pudo crear la cuenta");
        return;
      }

      const nombre = data.doctor?.full_name ?? "el nuevo miembro";
      onClose();
      toast.success(`Se creó la cuenta de ${nombre}. Comparte la contraseña temporal por un canal seguro.`, {
        duration: 8000,
      });
      router.refresh();
    } catch {
      toast.error("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Agregar miembro"
      description="La cuenta nace con la contraseña temporal que definas: compártela por un canal seguro y la persona podrá cambiarla después."
      busy={enviando}
    >
      <form onSubmit={crear} className="mt-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="miembro-nombre">
              Nombre completo
            </label>
            <input
              id="miembro-nombre"
              name="fullName"
              required
              minLength={3}
              maxLength={120}
              autoComplete="off"
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="miembro-correo">
              Correo
            </label>
            <input
              id="miembro-correo"
              name="email"
              type="email"
              required
              autoComplete="off"
              className={inputClasses}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="miembro-clave">
              Contraseña temporal
            </label>
            <input
              id="miembro-clave"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClasses}
            />
            <p className="mt-1 text-xs text-neutral-500">Mínimo 8 caracteres.</p>
          </div>

          <div>
            <label className={labelCls} htmlFor="miembro-rol">
              Rol
            </label>
            <select
              id="miembro-rol"
              name="role"
              value={rol}
              onChange={(e) => setRol(e.target.value as typeof rol)}
              className={inputClasses}
            >
              <option value="professional">Profesional</option>
              <option value="reception">Recepción</option>
            </select>
          </div>
        </div>

        {rol === "professional" ? (
          <div>
            <label className={labelCls} htmlFor="miembro-especialidad">
              Especialidad
            </label>
            <input
              id="miembro-especialidad"
              name="specialty"
              maxLength={80}
              autoComplete="off"
              placeholder="Opcional"
              className={inputClasses}
            />
          </div>
        ) : null}

        <label className="flex items-start gap-2 text-sm text-neutral-700">
          <Checkbox name="isAdmin" className="mt-1" />
          <span>
            Puede administrar el equipo
            <span className="block text-xs text-neutral-500">
              Agregar miembros y activar o desactivar cuentas.
            </span>
          </span>
        </label>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <AsyncButton
            type="submit"
            loading={enviando}
            pendingLabel="Creando la cuenta del miembro"
            className={buttonClasses("primary", "md")}
          >
            Crear miembro
          </AsyncButton>
        </div>
      </form>

      <p className="sr-only" aria-live="polite">
        {enviando ? "Creando la cuenta del miembro" : ""}
      </p>
    </Modal>
  );
}

export function AddMemberButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Agregar miembro</Button>
      <AddMemberModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
