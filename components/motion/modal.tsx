"use client";

import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "cn";
import { DUR, EASE } from "@/lib/motion";

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
} as const;

export type ModalSize = keyof typeof SIZES;

const subscribe = () => () => {};
const isClient = () => true;
const isServer = () => false;

interface ModalProps {
  /**
   * Controla la presencia del diálogo. Si se omite, el componente se
   * considera siempre visible y la animación de salida la maneja el
   * `AnimatePresence` que lo monta (patrón `{abierto ? <Modal /> : null}`).
   */
  open?: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  /** Se usa sólo cuando no hay `title`; si hay `title`, el diálogo se anuncia con él. */
  ariaLabel?: string;
  titleClassName?: string;
  panelClassName?: string;
  overlayClassName?: string;
  /** Si es `true`, el fondo no cierra el diálogo (p. ej. mientras guarda). */
  busy?: boolean;
  closeOnBackdrop?: boolean;
}

/**
 * Diálogo del panel.
 *
 * Se monta en `document.body` con un portal: así ningún contexto de
 * apilamiento de la página (animaciones de entrada, `transform`, `opacity`)
 * puede dejarlo por debajo del header sticky.
 *
 * El centrado usa `items-start` + `my-auto` en el panel. Con contenido más
 * alto que la pantalla los márgenes automáticos se resuelven a cero y el
 * scroll llega hasta el título; con `items-center` la parte superior quedaría
 * fuera del área desplazable.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "lg",
  ariaLabel,
  titleClassName,
  panelClassName,
  overlayClassName,
  busy = false,
  closeOnBackdrop = true,
}: ModalProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const mounted = useSyncExternalStore(subscribe, isClient, isServer);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const visible = open !== false;

  useEffect(() => {
    if (!visible) return;
    previousFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (panel && !panel.contains(document.activeElement)) {
        panel.focus({ preventScroll: true });
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      previousFocus.current?.focus();
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || busy) return;
      event.stopPropagation();
      onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [visible, onClose, busy]);

  useEffect(() => {
    if (!visible) return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const gutter = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (gutter > 0) body.style.paddingRight = `${gutter}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [visible]);

  if (!mounted) return null;

  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : DUR.micro, ease: EASE.out }}
      className={cn(
        "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-navy-900/40 p-4 backdrop-blur-xs",
        overlayClassName,
      )}
      onClick={() => {
        if (closeOnBackdrop && !busy) onClose();
      }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        tabIndex={-1}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 16 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
        transition={
          reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 450, damping: 32 }
        }
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "my-auto w-full rounded-card border border-neutral-200/80 bg-white p-6 shadow-2xl outline-none",
          SIZES[size],
          panelClassName,
        )}
      >
        {title ? (
          <h2
            id={titleId}
            className={cn("text-lg font-semibold text-action-primary", titleClassName)}
          >
            {title}
          </h2>
        ) : null}
        {description ? <p className="mt-1 text-sm text-neutral-600">{description}</p> : null}
        {children}
        {footer}
      </motion.div>
    </motion.div>
  );

  return createPortal(
    open === undefined ? content : <AnimatePresence>{open ? content : null}</AnimatePresence>,
    document.body,
  );
}
