"use client";

import { useEffect, useRef } from "react";

/**
 * Widget de Cloudflare Turnstile.
 *
 * Si no hay site key (desarrollo), se renderiza un aviso discreto y la
 * verificación del servidor también se omite: la app debe poder correr
 * local sin credenciales de terceros.
 *
 * El token que entrega Cloudflare es de UN SOLO USO y caduca a los cinco
 * minutos. Por eso `resetKey` existe: cuando cambia, el widget se reinicia
 * y se entrega un token vacío. Sin esto, un paciente cuyo primer intento
 * falló (por ejemplo porque le quitaron la hora) reenvía en el reintento el
 * token ya gastado, Cloudflare lo rechaza y le es imposible reservar: un
 * solo fallo lo deja bloqueado.
 */
export default function Turnstile({
  onToken,
  resetKey = 0,
}: {
  onToken: (token: string) => void;
  resetKey?: number;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  // El callback se guarda en una ref para no reconstruir el efecto (y
  // por tanto el widget) cada vez que el padre pasa una función nueva.
  // La sincronización va en un efecto y no en el cuerpo del componente:
  // escribir una ref durante el render lo prohíbe la regla
  // `react-hooks/refs` del plugin de React Compiler.
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    const render = () => {
      if (!containerRef.current || widgetId.current) return;
      widgetId.current =
        window.turnstile?.render(containerRef.current, {
          sitekey: siteKey,
          theme: "light",
          language: "es",
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(""),
          "error-callback": () => onTokenRef.current(""),
        }) ?? null;
    };

    if (window.turnstile) {
      render();
      return () => {
        if (widgetId.current) window.turnstile?.remove(widgetId.current);
        widgetId.current = null;
      };
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-agenda-turnstile="true"]',
    );
    if (existing) {
      existing.addEventListener("load", render, { once: true });
      return () => {
        existing.removeEventListener("load", render);
        if (widgetId.current) window.turnstile?.remove(widgetId.current);
        widgetId.current = null;
      };
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.agendaTurnstile = "true";
    script.addEventListener("load", render, { once: true });
    document.head.appendChild(script);

    return () => {
      script.removeEventListener("load", render);
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey]);

  /*
   * Se mueve el reinicio a su propio efecto. Antes estaba en las
   * dependencias del efecto anterior, pero el guard
   * `if (widgetId.current) return` hacía que el widget no volviera a
   * crearse: `resetKey` era un parámetro muerto.
   */
  useEffect(() => {
    if (!siteKey || resetKey === 0) return;
    if (widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
    }
    onTokenRef.current("");
  }, [resetKey, siteKey]);

  if (!siteKey) {
    return (
      <p className="text-xs text-neutral-500">
        Verificación anti-bot desactivada en este entorno.
      </p>
    );
  }

  return <div ref={containerRef} aria-label="Verificación de seguridad" />;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>,
      ) => string | undefined;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
  }
}