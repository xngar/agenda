"use client";

import { useCallback, useEffect, useState } from "react";
import type { DentalTreatmentCatalogItem, DentalTreatmentPlanItem, TreatmentPlanStatus } from "@/lib/ficha/types";
import { Card, CardHeader, Button, ErrorNotice, InfoNotice, Field, Spinner, inputClasses } from "@/components/ui";

interface PlanItem extends DentalTreatmentPlanItem {
  dental_treatments_catalog?: { name: string } | null;
}

const ESTADOS: { value: TreatmentPlanStatus; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "aceptado", label: "Aceptado" },
  { value: "en_curso", label: "En curso" },
  { value: "realizado", label: "Realizado" },
  { value: "rechazado", label: "Rechazado" },
];

function estadoBadge(status: TreatmentPlanStatus) {
  const map: Record<TreatmentPlanStatus, string> = {
    pendiente: "bg-neutral-200 text-neutral-700",
    aceptado: "bg-lime-100 text-lime-800",
    en_curso: "bg-brand-sky-100 text-brand-navy-900",
    realizado: "bg-brand-navy text-white",
    rechazado: "bg-neutral-200 text-neutral-600 line-through",
  };
  const label = ESTADOS.find((e) => e.value === status)?.label ?? status;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status]}`}>{label}</span>
  );
}

const fmt = (v: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(v);

export function PlanPanel({
  patientId,
  isAdmin,
}: {
  patientId: string;
  isAdmin: boolean;
}) {
  const [items, setItems] = useState<PlanItem[] | null>(null);
  const [catalog, setCatalog] = useState<DentalTreatmentCatalogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState({
    treatment_id: "",
    tooth: "",
    description: "",
    value: "",
    priority: "",
  });
  const [guardando, setGuardando] = useState(false);
  const [adminCat, setAdminCat] = useState(false);
  const [catNombre, setCatNombre] = useState("");
  const [catValor, setCatValor] = useState("");

  const cargar = useCallback(async () => {
    try {
      const [itemsR, catR] = await Promise.all([
        fetch(`/api/ficha/patients/${patientId}/plan`),
        fetch("/api/ficha/catalog"),
      ]);
      const itemsData = (await itemsR.json()) as { items?: PlanItem[]; error?: string };
      const catData = (await catR.json()) as { items?: DentalTreatmentCatalogItem[]; error?: string };
      if (!itemsR.ok) {
        setError(itemsData.error ?? "No se pudo cargar el plan");
        return;
      }
      if (!catR.ok) {
        setError(catData.error ?? "No se pudo cargar el catálogo");
        return;
      }
      setItems(itemsData.items ?? []);
      setCatalog(catData.items ?? []);
    } catch {
      setError("No pudimos conectarnos.");
    }
  }, [patientId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, setState tras await
    cargar();
  }, [cargar]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setGuardando(true);
    try {
      const treatment = catalog.find((c) => c.id === form.treatment_id);
      const response = await fetch(`/api/ficha/patients/${patientId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            patient_id: patientId,
            treatment_id: form.treatment_id || null,
            tooth: form.tooth ? Number(form.tooth) : null,
            description: form.description.trim() || undefined,
            value: form.value !== "" ? Number(form.value) : treatment?.default_value ?? 0,
            priority: form.priority !== "" ? Number(form.priority) : null,
          },
        ]),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo agregar el tratamiento");
        return;
      }
      setAviso("Tratamiento agregado al plan.");
      setNuevo(false);
      setForm({ treatment_id: "", tooth: "", description: "", value: "", priority: "" });
      cargar();
    } catch {
      setError("No pudimos conectarnos.");
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(item: PlanItem, status: TreatmentPlanStatus, approved?: boolean) {
    setError(null);
    try {
      const response = await fetch(`/api/ficha/plan/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(approved === undefined ? { status } : { status, approved }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo actualizar el plan");
        return;
      }
      cargar();
    } catch {
      setError("No pudimos conectarnos.");
    }
  }

  async function agregarCatalogo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const response = await fetch("/api/ficha/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: catNombre.trim(),
          default_value: Number(catValor) || 0,
          active: true,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo agregar el tratamiento al catálogo");
        return;
      }
      setAviso("Tratamiento agregado al catálogo.");
      setCatNombre("");
      setCatValor("");
      cargar();
    } catch {
      setError("No pudimos conectarnos.");
    } finally {
      setGuardando(false);
    }
  }

  async function alternarCatalogo(item: DentalTreatmentCatalogItem) {
    setError(null);
    try {
      const response = await fetch(`/api/ficha/catalog/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: item.name, default_value: item.default_value, active: !item.active }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo actualizar el catálogo");
        return;
      }
      cargar();
    } catch {
      setError("No pudimos conectarnos.");
    }
  }

  if (items === null) {
    return (
      <Card>
        <CardHeader title="Plan de tratamiento" />
        <div className="px-5 py-8">
          <Spinner label="Cargando plan…" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorNotice message={error} /> : null}
      {aviso ? <InfoNotice>{aviso}</InfoNotice> : null}

      <Card>
        <CardHeader
          title="Plan de tratamiento"
          description="Propuesta de tratamientos con valor, aceptación y avance."
          action={<Button size="sm" variant="secondary" onClick={() => setNuevo(!nuevo)}>{nuevo ? "Cancelar" : "Agregar tratamiento"}</Button>}
        />
        {nuevo ? (
          <form onSubmit={agregar} className="space-y-4 border-t border-neutral-200 px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tratamiento del catálogo" htmlFor="treatment" required={false}>
                <select
                  id="treatment"
                  className={inputClasses}
                  value={form.treatment_id}
                  onChange={(e) => {
                    const t = catalog.find((c) => c.id === e.target.value);
                    setForm((f) => ({
                      ...f,
                      treatment_id: e.target.value,
                      value: t ? String(t.default_value) : f.value,
                    }));
                  }}
                >
                  <option value="">Sin catálogo…</option>
                  {catalog.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({fmt(c.default_value)})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Pieza (número FDI)" htmlFor="tooth" required={false}>
                <input
                  id="tooth"
                  type="number"
                  min={11}
                  max={85}
                  className={inputClasses}
                  value={form.tooth}
                  onChange={(e) => setForm((f) => ({ ...f, tooth: e.target.value }))}
                />
              </Field>
              <Field label="Descripción" htmlFor="description" required={false}>
                <input
                  id="description"
                  className={inputClasses}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Valor ($)" htmlFor="value" required={false}>
                  <input
                    id="value"
                    type="number"
                    className={inputClasses}
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  />
                </Field>
                <Field label="Prioridad" htmlFor="priority" required={false}>
                  <input
                    id="priority"
                    type="number"
                    className={inputClasses}
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                  />
                </Field>
              </div>
            </div>
            <Button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Agregar al plan"}</Button>
          </form>
        ) : null}

        <ul className="divide-y divide-neutral-100">
          {items.length === 0 ? (
            <li className="px-5 py-8 text-sm text-neutral-500">Sin tratamientos en el plan.</li>
          ) : (
            items.map((it) => (
              <li key={it.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900">
                    {it.dental_treatments_catalog?.name ?? it.description ?? "Tratamiento"}
                    {it.tooth ? <span className="text-neutral-500"> · pieza {it.tooth}</span> : null}
                  </p>
                  <p className="text-sm text-neutral-600">
                    {it.value > 0 ? fmt(it.value) : "Sin valor"} · prioridad {it.priority ?? "—"}
                    {it.stage ? ` · etapa ${it.stage}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {estadoBadge(it.status)}
                  <select
                    className="rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800"
                    value={it.status}
                    onChange={(e) => cambiarEstado(it, e.target.value as TreatmentPlanStatus)}
                  >
                    {ESTADOS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  {it.status === "aceptado" && it.approved ? (
                    <button
                      type="button"
                      onClick={() => cambiarEstado(it, it.status, false)}
                      className="rounded-lg border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
                    >
                      Quitar aprobación
                    </button>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      </Card>

      {isAdmin ? (
        <Card>
          <CardHeader
            title="Catálogo de tratamientos"
            description="Tratamientos ofrecidos por la organización, con valor por defecto."
            action={<Button size="sm" variant="ghost" onClick={() => setAdminCat(!adminCat)}>{adminCat ? "Cerrar" : "Agregar"}</Button>}
          />
          {adminCat ? (
            <form onSubmit={agregarCatalogo} className="flex flex-wrap items-end gap-3 border-t border-neutral-200 px-5 py-4">
              <label className="block flex-1">
                <span className="mb-1 block text-xs font-medium text-neutral-600">Nombre del tratamiento</span>
                <input className={inputClasses} value={catNombre} onChange={(e) => setCatNombre(e.target.value)} required />
              </label>
              <label className="block w-32">
                <span className="mb-1 block text-xs font-medium text-neutral-600">Valor ($)</span>
                <input type="number" className={inputClasses} value={catValor} onChange={(e) => setCatValor(e.target.value)} />
              </label>
              <Button type="submit" disabled={guardando || !catNombre.trim()}>Agregar</Button>
            </form>
          ) : null}
          <ul className="divide-y divide-neutral-100">
            {catalog.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="font-medium text-neutral-900">{c.name}</p>
                  <p className="text-sm text-neutral-600">{fmt(c.default_value)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => alternarCatalogo(c)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${c.active ? "border-neutral-300 text-neutral-600 hover:bg-neutral-100" : "border-brand-navy-200 text-brand-navy"}`}
                >
                  {c.active ? "Desactivar" : "Activar"}
                </button>
              </li>
            ))}
            {catalog.length === 0 ? (
              <li className="px-5 py-8 text-sm text-neutral-500">Catálogo vacío.</li>
            ) : null}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}