"use client";

import type { AriaAttributes, ReactNode } from "react";
import Link from "next/link";
import { ChevronsUpDown, ChevronUp } from "lucide-react";
import { formatRut } from "@/lib/rut";
import { TruncatedText } from "@/components/ui/truncated-text";
import { WhatsappButton } from "@/components/dashboard/whatsapp-button";
import { AnimatedNumber } from "@/components/motion/animated-number";

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

/**
 * Listado de pacientes del panel.
 *
 * Es un client component para poder animar la entrada de las filas y la
 * rotación del ícono de ordenamiento. Los datos siguen llegando desde el
 * servidor: este componente solo los pinta.
 */
export function PatientsTable({
  patients,
  total,
  page,
  totalPages,
  params,
  orgName,
}: {
  patients: ListPatient[];
  total: number;
  page: number;
  totalPages: number;
  params: ListParams;
  orgName: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-600" data-testid="patients-count">
        <AnimatedNumber value={total} /> {total === 1 ? "paciente" : "pacientes"}
      </p>

      <div className="hidden overflow-x-auto rounded-card border border-neutral-200 bg-white md:block">
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
                        className={`inline-flex items-center gap-1 transition-colors duration-micro ease-out-soft hover:text-brand-navy ${
                          activa ? "text-brand-navy" : ""
                        }`}
                      >
                        {col.label}
                        <span
                          aria-hidden
                          className="anim-sort-icon inline-flex"
                          style={
                            activa && params.dir === "desc" ? { transform: "rotate(180deg)" } : undefined
                          }
                        >
                          {activa ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </span>
                      </Link>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {patients.map((p, indice) => (
              <tr
                key={p.id}
                className="anim-row-in transition-colors duration-micro ease-out-soft hover:bg-action-primary/5"
                style={{ animationDelay: `${Math.min(indice, 12) * 35}ms` }}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/pacientes/${p.id}`}
                    className="font-medium text-neutral-900 transition-colors duration-micro ease-out-soft hover:text-brand-navy hover:underline"
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
                  {p.phone ? (
                    <TruncatedText text={p.phone} className="max-w-52 text-neutral-800" />
                  ) : null}
                  {p.email ? (
                    <TruncatedText
                      text={p.email}
                      className={`max-w-52 ${p.phone ? "text-xs text-neutral-500" : "text-neutral-800"}`}
                    />
                  ) : null}
                  {!p.phone && !p.email ? <p className="text-neutral-800">—</p> : null}
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
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <WhatsappButton
                      patientId={p.id}
                      fullName={p.full_name}
                      phone={p.phone}
                      orgName={orgName}
                    />
                    <Link
                      href={`/dashboard/pacientes/${p.id}`}
                      aria-label={`Abrir ficha de ${p.full_name}`}
                      title="Abrir ficha"
                      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-[#fdb833] px-2.5 text-sm font-semibold text-brand-navy transition-colors duration-element ease-in-out-soft hover:bg-[#ffd16b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
                    >
                      Ver ficha
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul
        className="space-y-2 md:hidden"
        data-testid="patients-cards"
      >
        {patients.map((p, indice) => (
          <li
            key={p.id}
            className="anim-row-in rounded-card border border-neutral-200 bg-white p-4"
            style={{ animationDelay: `${Math.min(indice, 12) * 35}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/dashboard/pacientes/${p.id}`}
                  className="font-medium text-neutral-900 transition-colors duration-micro ease-out-soft hover:text-brand-navy hover:underline"
                >
                  {p.full_name}
                </Link>
                {p.doctor?.full_name ? (
                  <p className="text-xs text-brand-navy-700">Paciente de {p.doctor.full_name}</p>
                ) : null}
              </div>
              {statusPill(p.patient_status)}
            </div>

            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-neutral-500">RUT</dt>
                <dd className="min-w-0 truncate text-neutral-800">
                  {p.rut ? (formatRut(p.rut) ?? p.rut) : "—"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-neutral-500">Contacto</dt>
                <dd className="min-w-0 space-y-0.5 text-neutral-800">
                  {p.phone ? <span className="block">{p.phone}</span> : null}
                  {p.email ? (
                    <span className={`block break-all ${p.phone ? "text-neutral-600" : ""}`}>
                      {p.email}
                    </span>
                  ) : null}
                  {!p.phone && !p.email ? "—" : null}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-neutral-500">Nacimiento</dt>
                <dd className="min-w-0 text-neutral-800">
                  {p.birth_date ? `${p.birth_date.slice(0, 10)} · ${sexLabel(p.sex)}` : "—"}
                </dd>
              </div>
            </dl>

            <div className="mt-3 flex items-center gap-2">
              <WhatsappButton
                patientId={p.id}
                fullName={p.full_name}
                phone={p.phone}
                orgName={orgName}
              />
              <Link
                href={`/dashboard/pacientes/${p.id}`}
                aria-label={`Abrir ficha de ${p.full_name}`}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-[#fdb833] px-2.5 text-sm font-semibold text-brand-navy transition-colors duration-element ease-in-out-soft hover:bg-[#ffd16b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
              >
                Ver ficha
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </li>
        ))}
      </ul>
      {total > 0 ? (
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
                className="rounded-lg border border-brand-navy-200 px-3 py-1.5 text-sm font-medium text-brand-navy-700 transition-[color,background-color,border-color] duration-micro ease-out-soft hover:border-action-primary/40 hover:bg-action-primary/5 hover:text-action-primary"
              >
                ← Anterior
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-400">
                ← Anterior
              </span>
            )}
            {page < totalPages ? (
              <Link
                href={listHref(params, page + 1)}
                rel="next"
                className="rounded-lg border border-brand-navy-200 px-3 py-1.5 text-sm font-medium text-brand-navy-700 transition-[color,background-color,border-color] duration-micro ease-out-soft hover:border-action-primary/40 hover:bg-action-primary/5 hover:text-action-primary"
              >
                Siguiente →
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-400">
                Siguiente →
              </span>
            )}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
