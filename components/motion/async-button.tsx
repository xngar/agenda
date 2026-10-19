"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "cn";
import { DUR, EASE } from "@/lib/motion";
import { useMotionPrefs } from "./use-motion-prefs";

type Estado = "idle" | "loading" | "ok" | "error";

/**
 * Botón con acción asíncrona: muestra un spinner mientras corre y, si el
 * botón gestiona la acción, una confirmación breve de éxito o error.
 *
 * El contenido del botón nunca se sustituye por el spinner: el spinner se
 * superpone sobre el contenido original, que queda atenuado. El botón
 * conserva su tamaño en todo momento, así que no hay salto de layout.
 *
 * Dos formas de uso:
 * - **Controlado** (`loading`): el padre decide si está cargando. El botón
 *   sólo muestra el spinner; el resultado se comunica por el canal que ya
 *   use el padre (un toast, por ejemplo). Es el modo de los formularios.
 * - **Autónomo** (`onClick` sin `loading`): el botón ejecuta la acción y
 *   muestra "Listo" o "No se pudo" sobre sí mismo durante 1,6 s.
 */
export function AsyncButton({
  children,
  onClick,
  className,
  disabled,
  loading,
  pendingLabel = "Procesando",
  successLabel = "Listo",
  errorLabel = "No se pudo",
  type = "button",
}: {
  children: ReactNode;
  /** Acción asíncrona. Si lanza, el botón muestra el estado de error. */
  onClick?: () => Promise<void> | void;
  className?: string;
  disabled?: boolean;
  /**
   * Estado controlado (formularios): el padre decide si está cargando.
   * Cuando se pasa, el botón no muestra la confirmación de éxito/error.
   */
  loading?: boolean;
  /** Texto anunciado en el lector de pantalla mientras la acción corre. */
  pendingLabel?: string;
  successLabel?: string;
  errorLabel?: string;
  type?: "button" | "submit";
}) {
  const [estado, setEstado] = useState<Estado>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { reduce } = useMotionPrefs();

  const controlado = loading !== undefined;

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function ejecutar() {
    if (!onClick) return;

    // En modo controlado el padre manda: el botón sólo ejecuta la acción.
    if (!controlado) {
      if (estado !== "idle") return;
      setEstado("loading");
    }

    try {
      await onClick();
      if (!controlado) setEstado("ok");
    } catch {
      if (!controlado) setEstado("error");
    }

    if (!controlado) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setEstado("idle"), 1600);
    }
  }

  const cargando = controlado ? loading : estado === "loading";

  return (
    <button
      type={type}
      onClick={onClick ? ejecutar : undefined}
      disabled={disabled || cargando}
      data-estado={estado}
      className={cn("relative overflow-hidden", className)}
    >
      <span
        aria-hidden={cargando ? true : undefined}
        className={cargando ? "opacity-40 transition-opacity" : undefined}
      >
        {children}
      </span>

      {cargando ? (
        <span aria-hidden className="absolute inset-0 grid place-items-center">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
        </span>
      ) : null}

      <AnimatePresence>
        {!controlado && (estado === "ok" || estado === "error") ? (
          <motion.span
            key={estado}
            initial={{ opacity: 0, y: reduce ? 0 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : DUR.micro, ease: EASE.out }}
            className={cn(
              "absolute inset-0 grid place-items-center text-sm font-medium",
              estado === "ok" ? "text-success-700" : "text-danger-700",
            )}
          >
            {estado === "ok" ? successLabel : errorLabel}
          </motion.span>
        ) : null}
      </AnimatePresence>

      <span className="sr-only" role="status">
        {cargando ? pendingLabel : ""}
      </span>
    </button>
  );
}
