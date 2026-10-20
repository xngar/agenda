import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";

const card = "rounded-card border border-neutral-200 bg-white p-4";

export default function EstadisticasLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando estadísticas…</span>

      {[0, 1, 2].map((fila) => (
        <div key={fila} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((indice) => (
            <div key={indice} className={card}>
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="mt-3 h-7 w-1/2" />
              <Skeleton className="mt-2 h-3 w-4/5" />
            </div>
          ))}
        </div>
      ))}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((indice) => (
          <div key={indice} className={card}>
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="mt-2 mb-4 h-3 w-2/3" />
            <Skeleton className={cn("h-64 w-full")}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
