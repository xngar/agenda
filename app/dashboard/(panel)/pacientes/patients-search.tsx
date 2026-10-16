"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, buttonClasses, inputClasses } from "@/components/ui";

const DEBOUNCE_MS = 500;

export function PatientsSearch({
  initialQ,
  initialStatus,
}: {
  initialQ: string;
  initialStatus: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState(initialStatus ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFilter = q.trim() !== "" || status !== "";

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const [synced, setSynced] = useState({ q: initialQ, s: initialStatus });
  if (synced.q !== initialQ || synced.s !== initialStatus) {
    setSynced({ q: initialQ, s: initialStatus });
    setQ(initialQ);
    setStatus(initialStatus ?? "");
  }

  function navegar(qVal: string, statusVal: string) {
    const next = new URLSearchParams();
    if (qVal.trim()) next.set("q", qVal.trim());
    if (statusVal) next.set("status", statusVal);
    const sort = searchParams.get("sort");
    const dir = searchParams.get("dir");
    if (sort) next.set("sort", sort);
    if (dir) next.set("dir", dir);
    const actual = new URLSearchParams();
    const actualQ = searchParams.get("q") ?? "";
    const actualStatus = searchParams.get("status") ?? "";
    if (actualQ) actual.set("q", actualQ);
    if (actualStatus) actual.set("status", actualStatus);
    if (sort) actual.set("sort", sort);
    if (dir) actual.set("dir", dir);
    if (next.toString() === actual.toString()) return;
    startTransition(() => {
      router.replace(`/dashboard/pacientes${next.toString() ? `?${next.toString()}` : ""}`);
    });
  }

  function programar(qVal: string, statusVal: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => navegar(qVal, statusVal), DEBOUNCE_MS);
  }

  function buscar(e?: React.FormEvent) {
    e?.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    navegar(q, status);
  }

  return (
    <form onSubmit={buscar} role="search" className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
        >
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth={2} />
          <path d="m16 16 4 4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        </svg>
        <input
          type="search"
          aria-label="Buscar por nombre, RUT o correo"
          className={`${inputClasses} pl-9`}
          value={q}
          placeholder="Buscar por nombre, RUT o correo…"
          onChange={(e) => {
            setQ(e.target.value);
            programar(e.target.value, status);
          }}
        />
      </div>
      <select
        aria-label="Estado"
        title="Filtrar por estado"
        className={`${inputClasses} w-full sm:w-auto`}
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          if (timer.current) clearTimeout(timer.current);
          navegar(q, e.target.value);
        }}
      >
        <option value="">Todos</option>
        <option value="active">Activos</option>
        <option value="inactive">Inactivos</option>
        <option value="abandoned">Abandonados</option>
      </select>
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={isPending}
          aria-busy={isPending}
          className="w-32"
        >
          {isPending ? (
            <>
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4 animate-spin"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  className="opacity-25"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              </svg>
              Buscando…
            </>
          ) : (
            "Buscar"
          )}
        </Button>
        <Link
          href="/dashboard/pacientes"
          aria-disabled={!hasFilter}
          tabIndex={hasFilter ? undefined : -1}
          className={buttonClasses(
            "ghost",
            "sm",
            hasFilter ? "" : "pointer-events-none opacity-50",
          )}
        >
          Limpiar
        </Link>
      </div>
    </form>
  );
}
