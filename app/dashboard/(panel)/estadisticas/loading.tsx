import { Skeleton } from "@/components/ui/skeleton";

const card =
  "rounded-card border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)]";

/** Cuerpo de gráfico de barras verticales: eje, línea base y barras de alturas dispares. */
function BarsSkeleton({ height }: { height: string }) {
  const alturas = [45, 72, 30, 88, 56, 38, 64, 24, 78, 50, 34, 60];

  return (
    <div className={`flex items-end gap-2 ${height}`} aria-hidden="true">
      <div className="flex h-full w-8 shrink-0 flex-col justify-between py-1">
        {[0, 1, 2, 3].map((indice) => (
          <Skeleton key={indice} className="h-2 w-5" />
        ))}
      </div>
      <div className="flex h-full flex-1 items-end gap-1.5 border-b border-neutral-200 pb-1">
        {alturas.map((altura, indice) => (
          <Skeleton
            key={indice}
            className="w-full rounded-t-sm"
            style={{ height: `${altura}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/** Cuerpo de gráfico de barras horizontales con etiquetas a la izquierda. */
function BarsHorizontalSkeleton() {
  const anchos = [88, 74, 63, 52, 44, 34, 26, 18];

  return (
    <div className="flex h-72 flex-col justify-between" aria-hidden="true">
      {anchos.map((ancho, indice) => (
        <div key={indice} className="flex items-center gap-3">
          <Skeleton className="h-2.5 w-24 shrink-0" />
          <Skeleton className="h-4 rounded-r-sm" style={{ width: `${ancho}%` }} />
        </div>
      ))}
    </div>
  );
}

/** Mapa de calor: siete filas (días) por celdas horarias. */
function HeatmapSkeleton() {
  return (
    <div className="space-y-1 overflow-hidden" aria-hidden="true">
      <div className="flex items-center gap-1 pl-9">
        {Array.from({ length: 10 }, (_, indice) => (
          <Skeleton key={indice} className="h-2.5 w-10" />
        ))}
      </div>
      {Array.from({ length: 7 }, (_, fila) => (
        <div key={fila} className="flex items-center gap-1">
          <Skeleton className="mr-1 h-2.5 w-8" />
          {Array.from({ length: 10 }, (_, columna) => (
            <Skeleton
              key={columna}
              className="h-7 w-10 rounded"
              style={{ opacity: 0.55 + ((fila * 7 + columna * 3) % 5) * 0.1 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function EstadisticasLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando estadísticas…</span>

      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-8 w-56" />
          <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
          <Skeleton className="mt-2 h-4 w-2/3 max-w-md" />
          <Skeleton className="mt-3 h-5 w-36 rounded-full" />
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <Skeleton className="h-9 w-56 rounded-lg" />
        <Skeleton className="h-9 w-44 rounded-lg" />
      </div>

      <Skeleton className="h-3 w-80 max-w-full" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((indice) => (
          <div key={indice} className={card}>
            <div className="flex items-baseline justify-between gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-10 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-7 w-24" />
            <Skeleton className="mt-2 h-3 w-32" />
            <Skeleton className="mt-1.5 h-2.5 w-20" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className={card}>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 mb-4 h-3 w-3/4" />
          <BarsSkeleton height="h-72" />
        </section>

        <section className={card}>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 mb-4 h-3 w-2/3" />
          <Skeleton className="h-8 w-full rounded-lg" />
          <div className="mt-3 flex flex-wrap gap-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </section>

        <section className={card}>
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-2 mb-4 h-3 w-3/4" />
          <BarsSkeleton height="h-64" />
          <div className="mt-3 border-t border-neutral-100 pt-2">
            <Skeleton className="h-3 w-2/3" />
          </div>
        </section>

        <section className={card}>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 mb-4 h-3 w-3/4" />
          <BarsHorizontalSkeleton />
          <div className="mt-3 space-y-2 border-t border-neutral-100 pt-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        </section>
      </div>

      <section className={card}>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-2 mb-4 h-3 w-64 max-w-full" />
        <HeatmapSkeleton />
      </section>
    </div>
  );
}
