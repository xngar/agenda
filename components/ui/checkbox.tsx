import * as React from "react";
import { cn } from "cn";

/**
 * Checkbox con indicador animado.
 *
 * Sigue siendo un `<input type="checkbox">` nativo: hereda foco, teclado,
 * formulario y lectores de pantalla sin cambiar. Lo único que se hace es
 * quitar la apariencia nativa y dibujar el indicador con CSS, para que la
 * marca entre con un scale corto en vez de aparecer de golpe.
 *
 * El indicador se dibuja con `::after` (un borde en dos lados que se gira
 * 45 grados) y se anima con `transform`, que no fuerza reflow.
 */
function Checkbox({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      className={cn(
        "peer relative size-4 shrink-0 cursor-pointer appearance-none rounded border border-neutral-300 bg-white",
        "transition-[background-color,border-color,box-shadow] duration-micro ease-out-soft",
        "checked:border-brand-navy checked:bg-brand-navy",
        "after:absolute after:inset-0 after:m-auto after:h-2 after:w-2 after:rotate-45 after:scale-0 after:opacity-0",
        "after:border-b-2 after:border-r-2 after:border-white after:content-['']",
        "after:transition-[scale,opacity] duration-micro ease-out-soft",
        "checked:after:scale-100 checked:after:opacity-100",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Checkbox };
