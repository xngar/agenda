"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Texto de una línea con puntos suspensivos y tooltip solo cuando el
 * contenido realmente no cabe. El texto completo permanece en el DOM, así
 * que los lectores de pantalla lo leen sin depender del tooltip.
 */
export function TruncatedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncado, setTruncado] = useState(false);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;

    const medir = () => setTruncado(elemento.scrollWidth > elemento.clientWidth + 1);
    medir();

    if (typeof ResizeObserver === "undefined") return;
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [text]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          ref={ref}
          tabIndex={truncado ? 0 : undefined}
          className={cn("block truncate", className)}
        >
          {text}
        </span>
      </TooltipTrigger>
      {truncado ? (
        <TooltipContent className="break-all">{text}</TooltipContent>
      ) : null}
    </Tooltip>
  );
}
