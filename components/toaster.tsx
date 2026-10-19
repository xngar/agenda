"use client";

import { Toaster } from "sonner";

/**
 * Notificaciones del panel.
 *
 * `sonner` ya anima la entrada y la salida de los toasts; las duraciones y
 * el easing se ajustan en `app/globals.css` con los tokens de motion, porque
 * sonner inyecta su propia hoja de estilos en runtime y una clase pasada
 * por aquí no la reemplaza.
 */
export function AppToaster() {
  return <Toaster richColors position="bottom-right" closeButton duration={4000} />;
}
