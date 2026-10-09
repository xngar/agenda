"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrganizationType, Patient, PatientMedicalBackground } from "@/lib/ficha/types";
import { Button, ErrorNotice, buttonClasses } from "@/components/ui";
import { ResumenPanel } from "./resumen-panel";
import { AntecedentesPanel } from "./antecedentes-panel";
import { AtencionesPanel } from "./atenciones-panel";
import { OdontogramaPanel } from "./odontograma-panel";
import { PlanPanel } from "./plan-panel";
import { RecetasPanel } from "./recetas-panel";
import { AdjuntosPanel } from "./adjuntos-panel";
import { AuditoriaPanel } from "./auditoria-panel";
import { PatientFormModal } from "../patient-form";

const TABS_CLINICA_COMMON = [
  { id: "resumen", label: "Resumen" },
  { id: "antecedentes", label: "Antecedentes" },
  { id: "atenciones", label: "Atenciones" },
  { id: "recetas", label: "Recetas" },
  { id: "adjuntos", label: "Adjuntos" },
];

const TABS_DENTAL = [
  { id: "resumen", label: "Resumen" },
  { id: "antecedentes", label: "Antecedentes" },
  { id: "atenciones", label: "Atenciones" },
  { id: "odontograma", label: "Odontograma" },
  { id: "plan", label: "Plan" },
  { id: "recetas", label: "Recetas" },
  { id: "adjuntos", label: "Adjuntos" },
];

function estadoLabel(status: string): string {
  switch (status) {
    case "active":
      return "Activo";
    case "inactive":
      return "Inactivo";
    case "abandoned":
      return "Abandonado";
    default:
      return status;
  }
}

export function FichaTabs({
  patient,
  background,
  orgType,
  orgId,
  isAdmin,
  canEdit = false,
}: {
  patient: Patient;
  background: PatientMedicalBackground | null;
  orgType: OrganizationType;
  orgId: string;
  isAdmin: boolean;
  canEdit?: boolean;
}) {
  const tabs = orgType === "dental" ? TABS_DENTAL : TABS_CLINICA_COMMON;
  const router = useRouter();
  const [active, setActive] = useState(tabs[0].id);
  const [auditoria, setAuditoria] = useState(isAdmin);
  const [editando, setEditando] = useState(false);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  async function eliminarPaciente() {
    setErrorEliminar(null);
    setEliminando(true);
    try {
      const res = await fetch(`/api/ficha/patients/${patient.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setErrorEliminar(data?.error ?? "No se pudo eliminar el paciente");
        return;
      }
      setConfirmandoEliminar(false);
      router.push("/dashboard/pacientes");
      router.refresh();
    } catch {
      setErrorEliminar("Error de conexión, intenta de nuevo");
    } finally {
      setEliminando(false);
    }
  }

  const visible = auditoria
    ? [...tabs, { id: "auditoria", label: "Auditoría" }]
    : tabs;

  if (!visible.some((t) => t.id === active)) setActive(visible[0].id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold text-brand-navy">{patient.full_name}</h1>
            <span className="rounded-full bg-lime-100 px-2.5 py-0.5 text-xs font-semibold text-lime-800">
              {estadoLabel(patient.patient_status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-600">
            {patient.rut ?? "Sin RUT"} · {patient.sex && patient.sex !== "undisclosed" ? `${patient.sex === "female" ? "Mujer" : patient.sex === "male" ? "Hombre" : "Otro"} · ` : ""}
            {patient.birth_date ? `Nacido/a ${patient.birth_date.slice(0, 10)}` : "Fecha de nacimiento no registrada"}
            {patient.doctors?.full_name ? (
              <>
                {" "}
                · <span className="text-brand-navy-700">Paciente de {patient.doctors.full_name}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            {canEdit ? (
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="inline-flex min-h-9 items-center rounded-xl border border-brand-navy-200 bg-transparent px-3 text-sm font-semibold text-brand-navy hover:bg-brand-navy-50"
                title="Editar datos del paciente"
              >
                Editar
              </button>
            ) : null}
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={auditoria}
                onChange={(e) => setAuditoria(e.target.checked)}
                className="h-4 w-4"
                title="Ver historial de auditoría"
              />
              <span className="text-neutral-600">Auditoría</span>
            </label>
            <a
              className="inline-flex min-h-9 items-center rounded-xl border border-brand-navy-200 bg-transparent px-3 text-sm font-semibold text-brand-navy hover:bg-brand-navy-50"
              href={`/api/ficha/patients/${patient.id}/export`}
              title="Descargar datos en JSON"
            >
              Exportar
            </a>
            <a
              className="inline-flex min-h-9 items-center rounded-xl bg-brand-navy px-3 text-sm font-semibold text-white hover:bg-brand-navy-700"
              href={`/api/ficha/patients/${patient.id}/pdf`}
              title="Descargar PDF de la ficha"
            >
              PDF
            </a>
            {canEdit ? (
              <button
                type="button"
                onClick={() => {
                  setErrorEliminar(null);
                  setConfirmandoEliminar(true);
                }}
                className={buttonClasses("danger", "sm")}
                title="Eliminar paciente"
              >
                Eliminar
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <nav aria-label="Secciones de la ficha" className="flex flex-wrap gap-1 border-b border-neutral-200">
        {visible.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            aria-current={active === tab.id ? "page" : undefined}
            className={`rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              active === tab.id
                ? "border-brand-navy text-brand-navy"
                : "border-transparent text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {active === "resumen" ? (
        <ResumenPanel patient={patient} orgType={orgType} canEdit={canEdit} />
      ) : active === "antecedentes" ? (
        <AntecedentesPanel patientId={patient.id} initial={background} />
      ) : active === "atenciones" ? (
        <AtencionesPanel patientId={patient.id} />
      ) : active === "odontograma" ? (
        <OdontogramaPanel patientId={patient.id} />
      ) : active === "plan" ? (
        <PlanPanel patientId={patient.id} isAdmin={isAdmin} />
      ) : active === "recetas" ? (
        <RecetasPanel patientId={patient.id} />
      ) : active === "adjuntos" ? (
        <AdjuntosPanel patientId={patient.id} orgId={orgId} />
      ) : active === "auditoria" ? (
        <AuditoriaPanel patientId={patient.id} isAdmin={isAdmin} />
      ) : null}

      <PatientFormModal
        open={editando}
        initial={{ id: patient.id, full_name: patient.full_name, rut: patient.rut, phone: patient.phone, email: patient.email, birth_date: patient.birth_date, sex: patient.sex }}
        onClose={() => setEditando(false)}
        onSaved={() => setEditando(false)}
      />

      {confirmandoEliminar ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-eliminar-paciente-titulo"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-neutral-900/50"
            onClick={() => {
              if (!eliminando) setConfirmandoEliminar(false);
            }}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-card">
            <h2 id="dialog-eliminar-paciente-titulo" className="text-lg font-bold text-brand-navy">
              ¿Eliminar {patient.full_name}?
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Se borrará la ficha del paciente y todo su historial clínico. Solo se pueden eliminar
              pacientes que nunca agendaron una cita. Esta acción no se puede deshacer.
            </p>

            {errorEliminar ? (
              <div className="mt-4">
                <ErrorNotice message={errorEliminar} />
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" size="sm" disabled={eliminando} onClick={() => setConfirmandoEliminar(false)}>
                Cancelar
              </Button>
              <button
                type="button"
                onClick={eliminarPaciente}
                disabled={eliminando}
                className={buttonClasses("danger", "sm")}
              >
                {eliminando ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}