export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Cargando agenda…">
      {/* Cabecera: Título y controles */}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="space-y-2">
          <div className="h-3 w-20 rounded-md bg-neutral-200" />
          <div className="h-9 w-52 rounded-lg bg-neutral-200" />
          <div className="h-4 w-36 rounded-md bg-neutral-200" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="h-11 w-44 rounded-xl bg-neutral-200" />
          <div className="h-11 w-40 rounded-xl bg-neutral-200" />
          <div className="h-11 w-32 rounded-xl bg-neutral-200" />
        </div>
      </div>

      {/* Controles de navegación */}
      <div className="flex flex-wrap items-center gap-2 rounded-card border border-neutral-200 bg-white p-2">
        <div className="flex items-center gap-1">
          <div className="h-9 w-9 rounded-lg bg-neutral-200" />
          <div className="h-9 w-36 rounded-lg bg-neutral-200" />
          <div className="h-9 w-9 rounded-lg bg-neutral-200" />
        </div>
        <div className="ml-auto h-2 w-24 rounded-full bg-neutral-200" />
      </div>

      {/* Grilla o lista placeholder */}
      <div className="min-h-96 rounded-card border border-neutral-200 bg-white p-6 shadow-card">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="h-4 w-28 rounded bg-neutral-200" />
            <div className="h-4 w-20 rounded bg-neutral-200" />
          </div>
          <div className="grid grid-cols-7 gap-2 pt-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-8 w-full rounded-lg bg-neutral-100" />
                <div className="h-24 w-full rounded-xl bg-neutral-100/70" />
                <div className="h-16 w-full rounded-xl bg-neutral-100/50" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
