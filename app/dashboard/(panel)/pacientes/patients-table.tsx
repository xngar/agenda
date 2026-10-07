import type { AriaAttributes, ReactNode } from "react";
import Link from "next/link";
import { formatRut } from "@/lib/rut";

export interface ListPatient {
  id: string;
  full_name: string;
  rut: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  sex: string | null;
  patient_status?: string | null;
  doctor?: { full_name: string } | null;
}

type SortKey = "full_name" | "rut" | "birth_date" | "patient_status";

interface ListParams {
  q: string;
  status: string;
  sort: SortKey;
  dir: "asc" | "desc";
}

const COLUMNS: { label: string; sort?: SortKey; className?: string }[] = [
  { label: "Paciente", sort: "full_name", className: "min-w-44" },
  { label: "RUT", sort: "rut" },
  { label: "Contacto" },
  { label: "Nacimiento", sort: "birth_date" },
  { label: "Estado", sort: "patient_status" },
];

function listHref(params: ListParams, page: number): string {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.status) query.set("status", params.status);
  if (params.sort !== "full_name") query.set("sort", params.sort);
  if (params.dir !== "asc") query.set("dir", params.dir);
  if (page > 1) query.set("page", String(page));
  const qs = query.toString();
  return `/dashboard/pacientes${qs ? `?${qs}` : ""}`;
}

function sortHref(params: ListParams, key: SortKey): string {
  const siguiente: ListParams =
    params.sort === key
      ? { ...params, dir: params.dir === "asc" ? "desc" : "asc" }
      : { ...params, sort: key, dir: "asc" };
  return listHref(siguiente, 1);
}

function sexLabel(sex: string | null): string {
  if (sex === "female") return "M";
  if (sex === "male") return "H";
  return "—";
}

function statusPill(status?: string | null): ReactNode {
  if (!status || status === "active") {
    return <span className="text-sm text-neutral-400">Activo</span>;
  }
  const label =
    status === "inactive" ? "Inactivo" : status === "abandoned" ? "Abandonado" : status;
  return (
    <span className="inline-flex items-center rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
      {label}
    </span>
  );
}

export function PatientsTable({
  patients,
  total,
  page,
  totalPages,
  params,
}: {
  patients: ListPatient[];
  total: number;
  page: number;
  totalPages: number;
  params: ListParams;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-600" data-testid="patients-count">
        {total === 1 ? "1 paciente" : `${total} pacientes`}
      </p>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[720px] text-sm" data-testid="patients-table">
          <caption className="sr-only">Pacientes de la organización</caption>
          <thead className="border-b border-neutral-200 bg-neutral-50">
            <tr>
              {COLUMNS.map((col) => {
                const key = col.sort;
                const activa = key ? params.sort === key : false;
                const ariaSort: AriaAttributes["aria-sort"] = key
                  ? activa
                    ? params.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                  : undefined;
                return (
                  <th
                    key={col.label}
                    scope="col"
                    aria-sort={ariaSort}
                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 ${col.className ?? ""}`}
                  >
                    {key ? (
                      <Link
                        href={sortHref(params, key)}
                        className={`inline-flex items-center gap-1 transition-colors hover:text-brand-navy ${
                          activa ? "text-brand-navy" : ""
                        }`}
                      >
                        {col.label}
                        <span aria-hidden className="text-[10px]">
                          {activa ? (params.dir === "asc" ? "▲" : "▼") : "▵"}
                        </span>
                      </Link>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <span className="sr-only">Abrir ficha</span>
                <span aria-hidden>›</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {patients.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-brand-sky-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/pacientes/${p.id}`}
                    className="font-medium text-neutral-900 transition-colors hover:text-brand-navy hover:underline"
                  >
                    {p.full_name}
                  </Link>
                  {p.doctor?.full_name ? (
                    <p className="text-xs text-brand-navy-700">Paciente de {p.doctor.full_name}</p>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-neutral-700">
                  {p.rut ? (formatRut(p.rut) ?? p.rut) : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <p className="text-neutral-800">{p.phone ?? p.email ?? "—"}</p>
                  {p.phone && p.email ? (
                    <p className="max-w-52 truncate text-xs text-neutral-500">{p.email}</p>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-neutral-700">
                  {p.birth_date ? (
                    <>
                      {p.birth_date.slice(0, 10)}
                      <span className="text-neutral-500"> · {sexLabel(p.sex)}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3">{statusPill(p.patient_status)}</td>
                <td className="px-4 py-3 text-right">
                  <span aria-hidden className="text-lg text-neutral-400">
                    ›
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <nav
          aria-label="Paginación de pacientes"
          className="flex flex-wrap items-center justify-between gap-3"
          data-testid="patients-pagination"
        >
          <p className="text-sm text-neutral-600">
            Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                href={listHref(params, page - 1)}
                rel="prev"
                className="rounded-lg border border-brand-navy-200 px-3 py-1.5 text-sm font-medium text-brand-navy-700 transition-colors hover:bg-brand-sky-50"
              >
                ‹ Anterior
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-400">
                ‹ Anterior
              </span>
            )}
            {page < totalPages ? (
              <Link
                href={listHref(params, page + 1)}
                rel="next"
                className="rounded-lg border border-brand-navy-200 px-3 py-1.5 text-sm font-medium text-brand-navy-700 transition-colors hover:bg-brand-sky-50"
              >
                Siguiente ›
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-400">
                Siguiente ›
              </span>
            )}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
