"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { DentalPayment, DentalPaymentMethod, DentalTreatmentCatalogItem, DentalTreatmentPlanItem, TreatmentPlanStatus } from "@/lib/ficha/types";
import { Card, CardHeader, Button, ErrorNotice, Field, Spinner, inputClasses, buttonClasses } from "@/components/ui";
import { Modal } from "@/components/motion/modal";
import { formatMiles, parseMiles } from "@/lib/clp";

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
    aceptado: "bg-success-50 text-success-700",
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

const METODOS: { value: DentalPaymentMethod; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "otro", label: "Otro" },
];

export function PlanPanel({
  patientId,
  isAdmin,
}: {
  patientId: string;
  isAdmin: boolean;
}) {
  const [items, setItems] = useState<PlanItem[] | null>(null);
  const [catalog, setCatalog] = useState<DentalTreatmentCatalogItem[]>([]);
  const [pagos, setPagos] = useState<DentalPayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nuevoPago, setNuevoPago] = useState(false);
  const [pagoForm, setPagoForm] = useState({ amount: "", paid_at: "", method: "efectivo", note: "" });
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
  const [editCat, setEditCat] = useState<{ id: string; name: string; value: string } | null>(null);
  const [porEliminarCat, setPorEliminarCat] = useState<DentalTreatmentCatalogItem | null>(null);
  const [eliminandoCat, setEliminandoCat] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [itemsR, catR, pagosR] = await Promise.all([
        fetch(`/api/ficha/patients/${patientId}/plan`),
        fetch("/api/ficha/catalog"),
        fetch(`/api/ficha/patients/${patientId}/payments`),
      ]);
      const itemsData = (await itemsR.json()) as { items?: PlanItem[]; error?: string };
      const catData = (await catR.json()) as { items?: DentalTreatmentCatalogItem[]; error?: string };
      const pagosData = (await pagosR.json()) as { payments?: DentalPayment[]; error?: string };
      if (!itemsR.ok) {
        setError(itemsData.error ?? "No se pudo cargar el plan");
        return;
      }
      if (!catR.ok) {
        setError(catData.error ?? "No se pudo cargar el catálogo");
        return;
      }
      if (!pagosR.ok) {
        setError(pagosData.error ?? "No se pudieron cargar los pagos");
        return;
      }
      setItems(itemsData.items ?? []);
      setCatalog(catData.items ?? []);
      setPagos(pagosData.payments ?? []);
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
            value: form.value !== "" ? (parseMiles(form.value) ?? 0) : (treatment?.default_value ?? 0),
            priority: form.priority !== "" ? Number(form.priority) : null,
          },
        ]),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo agregar el tratamiento");
        return;
      }
      toast.success("Tratamiento agregado al plan");
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
      toast.success("Plan actualizado");
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
          default_value: parseMiles(catValor) ?? 0,
          active: true,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo agregar el tratamiento al catálogo");
        return;
      }
      toast.success("Tratamiento agregado al catálogo");
      setCatNombre("");
      setCatValor("");
      cargar();
    } catch {
      setError("No pudimos conectarnos.");
    } finally {
      setGuardando(false);
    }
  }

  async function editarCatalogo(e: React.FormEvent) {
    e.preventDefault();
    if (!editCat) return;
    setError(null);
    setGuardando(true);
    try {
      const original = catalog.find((c) => c.id === editCat.id);
      const response = await fetch(`/api/ficha/catalog/${editCat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editCat.name.trim(),
          default_value: parseMiles(editCat.value) ?? 0,
          active: original?.active ?? true,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo actualizar el tratamiento del catálogo");
        return;
      }
      toast.success("Tratamiento del catálogo actualizado");
      setEditCat(null);
      cargar();
    } catch {
      setError("No pudimos conectarnos.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarCatalogo() {
    if (!porEliminarCat) return;
    setEliminandoCat(true);
    try {
      const response = await fetch(`/api/ficha/catalog/${porEliminarCat.id}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "No se pudo eliminar el tratamiento del catálogo");
        return;
      }
      toast.success(`"${porEliminarCat.name}" eliminado del catálogo`);
      setPorEliminarCat(null);
      cargar();
    } catch {
      toast.error("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setEliminandoCat(false);
    }
  }

  async function agregarPago(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const monto = parseMiles(pagoForm.amount) ?? 0;
      const response = await fetch(`/api/ficha/patients/${patientId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: monto,
          paid_at: pagoForm.paid_at || undefined,
          method: pagoForm.method,
          note: pagoForm.note.trim() || null,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo registrar el pago");
        return;
      }
      toast.success("Pago registrado");
      setNuevoPago(false);
      setPagoForm({ amount: "", paid_at: "", method: "efectivo", note: "" });
      cargar();
    } catch {
      setError("No pudimos conectarnos.");
    } finally {
      setGuardando(false);
    }
  }

  async function anularPago(pago: DentalPayment) {
    setError(null);
    try {
      const response = await fetch(`/api/ficha/payments/${pago.id}`, { method: "DELETE" });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo anular el pago");
        return;
      }
      toast.success("Pago anulado");
      cargar();
    } catch {
      setError("No pudimos conectarnos.");
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
                      value: t ? formatMiles(String(t.default_value)) : f.value,
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
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    className={inputClasses}
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: formatMiles(e.target.value) }))}
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

      <Card>
        <CardHeader
          title="Pagos y abonos"
          description="Dinero recibido del paciente contra el plan."
          action={<Button size="sm" variant="secondary" onClick={() => setNuevoPago(!nuevoPago)}>{nuevoPago ? "Cancelar" : "Registrar pago"}</Button>}
        />
        {(() => {
          const totalPlan = (items ?? []).filter((i) => i.status !== "rechazado").reduce((s, i) => s + Number(i.value), 0);
          const totalPagado = (pagos ?? []).reduce((s, p) => s + Number(p.amount), 0);
          const saldo = totalPlan - totalPagado;
          return (
            <dl className="grid grid-cols-3 gap-3 border-b border-neutral-100 px-5 py-4 text-center">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Plan</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums text-neutral-900">{fmt(totalPlan)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Pagado</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums text-success-700">{fmt(totalPagado)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Saldo</dt>
                <dd className={`mt-0.5 text-sm font-semibold tabular-nums ${saldo > 0 ? "text-brand-navy" : "text-neutral-500"}`}>{fmt(saldo)}</dd>
              </div>
            </dl>
          );
        })()}
        {nuevoPago ? (
          <form onSubmit={agregarPago} className="space-y-4 border-b border-neutral-100 px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Monto ($)" htmlFor="pago-monto">
                <input
                  id="pago-monto"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  required
                  className={inputClasses}
                  value={pagoForm.amount}
                  onChange={(e) => setPagoForm((f) => ({ ...f, amount: formatMiles(e.target.value) }))}
                />
              </Field>
              <Field label="Fecha" htmlFor="pago-fecha" required={false}>
                <input
                  id="pago-fecha"
                  type="date"
                  className={inputClasses}
                  value={pagoForm.paid_at}
                  onChange={(e) => setPagoForm((f) => ({ ...f, paid_at: e.target.value }))}
                />
              </Field>
              <Field label="Método" htmlFor="pago-metodo" required={false}>
                <select
                  id="pago-metodo"
                  className={inputClasses}
                  value={pagoForm.method}
                  onChange={(e) => setPagoForm((f) => ({ ...f, method: e.target.value }))}
                >
                  {METODOS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Nota" htmlFor="pago-nota" required={false}>
                <input
                  id="pago-nota"
                  className={inputClasses}
                  maxLength={500}
                  value={pagoForm.note}
                  onChange={(e) => setPagoForm((f) => ({ ...f, note: e.target.value }))}
                />
              </Field>
            </div>
            <Button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Registrar pago"}</Button>
          </form>
        ) : null}
        <ul className="divide-y divide-neutral-100">
          {(pagos ?? []).length === 0 ? (
            <li className="px-5 py-8 text-sm text-neutral-500">Sin pagos registrados.</li>
          ) : (
            (pagos ?? []).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="font-medium tabular-nums text-neutral-900">{fmt(Number(p.amount))}</p>
                  <p className="text-sm text-neutral-600">
                    {p.paid_at.slice(0, 10)} · {METODOS.find((m) => m.value === p.method)?.label ?? p.method}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                </div>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => anularPago(p)}
                    className="rounded-lg border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
                  >
                    Anular
                  </button>
                ) : null}
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
              <label className="block w-36">
                <span className="mb-1 block text-xs font-medium text-neutral-600">Valor ($)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  className={inputClasses}
                  value={catValor}
                  onChange={(e) => setCatValor(formatMiles(e.target.value))}
                />
              </label>
              <Button type="submit" disabled={guardando || !catNombre.trim()}>Agregar</Button>
            </form>
          ) : null}
          <ul className="divide-y divide-neutral-100">
            {catalog.map((c) => (
              <li key={c.id} className="px-5 py-3">
                {editCat?.id === c.id ? (
                  <form onSubmit={editarCatalogo} className="flex flex-wrap items-end gap-3">
                    <label className="block min-w-40 flex-1">
                      <span className="mb-1 block text-xs font-medium text-neutral-600">Nombre del tratamiento</span>
                      <input
                        className={inputClasses}
                        value={editCat.name}
                        onChange={(e) => setEditCat({ ...editCat, name: e.target.value })}
                        required
                      />
                    </label>
                    <label className="block w-36">
                      <span className="mb-1 block text-xs font-medium text-neutral-600">Valor ($)</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        className={inputClasses}
                        value={editCat.value}
                        onChange={(e) => setEditCat({ ...editCat, value: formatMiles(e.target.value) })}
                      />
                    </label>
                    <Button type="submit" size="sm" disabled={guardando || !editCat.name.trim()}>
                      {guardando ? "Guardando…" : "Guardar"}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" disabled={guardando} onClick={() => setEditCat(null)}>
                      Cancelar
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-neutral-900">{c.name}</p>
                      <p className="text-sm text-neutral-600">{fmt(c.default_value)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditCat({ id: c.id, name: c.name, value: formatMiles(String(c.default_value)) })}
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => alternarCatalogo(c)}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${c.active ? "border-neutral-300 text-neutral-600 hover:bg-neutral-100" : "border-brand-navy-200 text-brand-navy"}`}
                      >
                        {c.active ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPorEliminarCat(c)}
                        className="rounded-lg border border-danger-200 px-3 py-1.5 text-sm font-medium text-danger-700 hover:bg-danger-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
            {catalog.length === 0 ? (
              <li className="px-5 py-8 text-sm text-neutral-500">Catálogo vacío.</li>
            ) : null}
          </ul>
        </Card>
      ) : null}

      <Modal
        open={porEliminarCat !== null}
        onClose={() => setPorEliminarCat(null)}
        title={porEliminarCat ? `¿Eliminar ${porEliminarCat.name}?` : "Eliminar tratamiento"}
        titleClassName="text-lg font-bold text-brand-navy"
        size="md"
        panelClassName="border-transparent shadow-card"
        busy={eliminandoCat}
      >
        <p className="mt-2 text-sm text-neutral-600">
          Se quitará del catálogo de la organización. Los tratamientos del plan que lo usen
          se conservan. Esta acción no se puede deshacer.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" size="sm" disabled={eliminandoCat} onClick={() => setPorEliminarCat(null)}>
            Cancelar
          </Button>
          <button
            type="button"
            onClick={eliminarCatalogo}
            disabled={eliminandoCat}
            className={buttonClasses("danger", "sm")}
          >
            {eliminandoCat ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </Modal>
    </div>
  );
}