"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, inputClasses } from "@/components/ui";

export function PatientsSearch({
  initialQ,
  initialStatus,
}: {
  initialQ: string;
  initialStatus: string | null;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState(initialStatus ?? "");

  function buscar(e?: React.FormEvent) {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    router.push(`/dashboard/pacientes${params.toString() ? `?${params.toString()}` : ""}`);
    router.refresh();
  }

  return (
    <form onSubmit={buscar} className="flex flex-wrap items-end gap-3">
      <label className="block min-w-52 flex-1">
        <span className="mb-1 block text-xs font-medium text-neutral-600">Nombre, RUT o correo</span>
        <input
          type="search"
          className={inputClasses}
          value={q}
          placeholder="P. ej. 12.345.678-9"
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">Estado</span>
        <select className={inputClasses} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="abandoned">Abandonados</option>
        </select>
      </label>
      <Button type="submit">Buscar</Button>
    </form>
  );
}