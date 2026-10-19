import type { ReactNode } from "react";

/**
 * Encabezado de página del panel: antetítulo, título, descripción, metadatos
 * y acciones. Fija el ritmo vertical de todas las secciones (mismo orden y
 * tamaños) para que las páginas no se lean como pantallas distintas.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Chips o contadores que acompañan al título (debajo de él). */
  meta?: ReactNode;
  /** Botones y controles alineados a la derecha en pantallas anchas. */
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-navy-600">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-brand-navy sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-neutral-600">{description}</p>
        ) : null}
        {meta ? <div className="mt-2.5 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
