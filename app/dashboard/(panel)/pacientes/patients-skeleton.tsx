import { Skeleton } from "@/components/ui/skeleton";

const FILAS = 10;
const COLUMNAS = ["w-40", "w-20", "w-32", "w-24", "w-16", "w-20"];
const CELDAS = ["w-44", "w-20", "w-32", "w-24", "w-16", "w-20"];

/**
 * Silueta del listado de pacientes mientras se resuelve la consulta. Replica la
 * forma real (contador, tabla, tarjetas y paginación) para que la transición no
 * salte de tamaño.
 */
export function PatientsSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando pacientes…</span>

      <div aria-hidden="true" className="space-y-3">
        <Skeleton className="h-4 w-24" />

        <div className="hidden overflow-x-auto rounded-2xl border border-neutral-200 bg-white md:block">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                {COLUMNAS.map((w, i) => (
                  <th key={i} className="px-4 py-3 text-left">
                    <Skeleton className={`h-3 ${w}`} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {Array.from({ length: FILAS }, (_, fila) => (
                <tr key={fila}>
                  {CELDAS.map((w, i) => (
                    <td key={i} className="px-4 py-3">
                      <Skeleton className={`h-4 ${w}`} />
                      {i === 0 ? <Skeleton className="mt-2 h-3 w-32" /> : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="space-y-2 md:hidden">
          {Array.from({ length: FILAS }, (_, i) => (
            <li key={i} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="mt-3 space-y-2">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="mt-3 h-9 w-full rounded-lg" />
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}