"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionPrefs } from "./use-motion-prefs";

/**
 * Número que cuenta hacia su valor final al aparecer o al actualizarse.
 *
 * El conteo dura 400 ms: se siente vivo sin delaying el uso. Si el valor
 * cambia mientras el contador corre, vuelve a contar desde el valor actual
 * (no desde cero), para que el número no salte hacia atrás.
 *
 * El primer render ya muestra el valor final (lo que ve el servidor), así
 * que no hay un "0" parpadeando en el HTML: el conteo arranca apenas el
 * componente monta en el cliente.
 *
 * Con `prefers-reduced-motion` muestra el valor final de inmediato.
 */
export function AnimatedNumber({
  value,
  duration = 0.4,
  className,
  format,
}: {
  value: number;
  /** Duración del conteo en segundos. */
  duration?: number;
  className?: string;
  /** Formato del número (por defecto, entero con separador de miles). */
  format?: (n: number) => string;
}) {
  const { reduce } = useMotionPrefs();
  const [display, setDisplay] = useState(value);
  const frame = useRef<number | null>(null);
  const from = useRef(value);
  const primera = useRef(true);

  useEffect(() => {
    if (reduce) {
      from.current = value;
      primera.current = false;
      return;
    }

    // El primer conteo arranca desde cero; los siguientes, desde el valor
    // que se estaba mostrando.
    const origen = primera.current ? 0 : from.current;
    primera.current = false;
    const delta = value - origen;

    if (delta === 0) {
      from.current = value;
      return;
    }

    const inicio = performance.now();

    const tick = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / (duration * 1000));
      // Salida suave: rápido al principio, frenando al final.
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(origen + delta * eased));

      if (t < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        from.current = value;
      }
    };

    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      from.current = value;
    };
  }, [value, duration, reduce]);

  const texto = reduce ? value : display;

  return (
    <span className={className} aria-label={format ? format(value) : String(value)}>
      {format ? format(texto) : texto.toLocaleString("es-CL")}
    </span>
  );
}
