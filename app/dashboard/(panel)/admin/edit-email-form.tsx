"use client";

import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, buttonClasses, inputClasses } from "@/components/ui";
import { AsyncButton } from "@/components/motion/async-button";
import { Modal } from "@/components/motion/modal";

const labelCls = "mb-1 block text-xs font-medium text-neutral-600";

/**
 * Cambio de correo de acceso de un miembro del equipo. Es una acción que
 * no debería sorprender: el nuevo correo se usa desde la próxima visita,
 * así que el admin debe decirlo al profesional.
 */
export function EditEmailButton({
  doctorId,
  initialEmail,
}: {
  doctorId: string;
  initialEmail: string | null;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [correo, setCorreo] = useState(initialEmail ?? "");
  const [enviando, setEnviando] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- reabre con el correo vigente */
  useEffect(() => {
    if (abierto) setCorreo(initialEmail ?? "");
  }, [abierto, initialEmail]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);

    try {
      const response = await fetch("/api/dashboard/doctors/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, email: correo.trim() }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "No se pudo cambiar el correo");
        return;
      }

      setAbierto(false);
      toast.success("Correo de acceso actualizado", { duration: 6000 });
      router.refresh();
    } catch {
      toast.error("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  function abrir(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setAbierto(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        disabled={enviando}
        className={buttonClasses("ghost", "sm")}
      >
        Editar correo
      </button>

      {abierto ? (
        <Modal
          open={abierto}
          onClose={() => setAbierto(false)}
          title="Editar correo de acceso"
          description="El profesional deberá usar el correo nuevo para entrar al panel a partir de ahora."
          busy={enviando}
        >
          <form onSubmit={guardar} className="mt-4 space-y-3">
            <div>
              <label className={labelCls} htmlFor="miembro-correo-nuevo">
                Correo actual
              </label>
              <input
                id="miembro-correo-nuevo"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className={inputClasses}
              />
            </div>

            <p className="text-xs text-neutral-500">
              Si el correo ya pertenece a otra cuenta, la plataforma lo rechazará.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAbierto(false)}
                disabled={enviando}
              >
                Cancelar
              </Button>
              <AsyncButton
                type="submit"
                loading={enviando}
                pendingLabel="Guardando el correo nuevo"
                className={buttonClasses("primary", "md")}
              >
                Guardar correo
              </AsyncButton>
            </div>
          </form>

          <p className="sr-only" aria-live="polite">
            {enviando ? "Guardando el correo nuevo" : ""}
          </p>
        </Modal>
      ) : null}
    </>
  );
}
