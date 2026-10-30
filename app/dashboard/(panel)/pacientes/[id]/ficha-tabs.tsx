"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Download, Trash2 } from "lucide-react";
import type { OrganizationType, Patient, PatientMedicalBackground } from "@/lib/ficha/types";
import { Button, ErrorNotice, buttonClasses } from "@/components/ui";
import { Modal } from "@/components/motion/modal";
import { PageHeader } from "@/components/dashboard/page-header";
import { ResumenPanel } from "./resumen-panel";
import { AntecedentesPanel } from "./antecedentes-panel";
import { AtencionesPanel } from "./atenciones-panel";
import { OdontogramaPanel } from "./odontograma-panel";
import { PeriodontogramaPanel } from "./periodontograma-panel";
import { PlanPanel } from "./plan-panel";
import { RecetasPanel } from "./recetas-panel";
import { AdjuntosPanel } from "./adjuntos-panel";
import { AuditoriaPanel } from "./auditoria-panel";
import { ConsentimientosPanel } from "./consentimientos-panel";

const TABS_CLINICA_COMMON = [
  { id: "resumen", label: "Datos del paciente" },
  { id: "antecedentes", label: "Antecedentes" },
  { id: "atenciones", label: "Atenciones" },
  { id: "consentimientos", label: "Consentimientos" },
  { id: "recetas", label: "Recetas" },
  { id: "adjuntos", label: "Adjuntos" },
];

const TABS_DENTAL = [
  { id: "resumen", label: "Datos del paciente" },
  { id: "antecedentes", label: "Antecedentes" },
  { id: "atenciones", label: "Atenciones" },
  { id: "odontograma", label: "Odontograma" },
  { id: "periodoncia", label: "Periodoncia" },
  { id: "plan", label: "Plan" },
  { id: "recetas", label: "Recetas" },
  { id: "adjuntos", label: "Adjuntos" },
];

const TABS_PSYCHOLOGICAL = [
  { id: "resumen", label: "Datos del paciente" },
  { id: "antecedentes", label: "Antecedentes" },
  { id: "atenciones", label: "Atenciones" },
  { id: "consentimientos", label: "Consentimientos" },
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

const ESTADO_TONO: Record<string, string> = {
  active: "border-success-200 bg-success-50 text-success-700",
  inactive: "border-neutral-200 bg-neutral-100 text-neutral-600",
  abandoned: "border-warning-200 bg-warning-50 text-warning-700",
};

export function FichaTabs({
  patient,
  background,
  orgType,
  orgId,
  isAdmin,
  canEdit = false,
  canViewAudit = false,
}: {
  patient: Patient;
  background: PatientMedicalBackground | null;
  orgType: OrganizationType;
  orgId: string;
  isAdmin: boolean;
  canEdit?: boolean;
  /** El dueño del paciente también ve su historial, no sólo el admin. */
  canViewAudit?: boolean;
}) {
  const tabs =
    orgType === "dental"
      ? TABS_DENTAL
      : orgType === "psychological"
        ? TABS_PSYCHOLOGICAL
        : TABS_CLINICA_COMMON;
  const router = useRouter();
  const [active, setActive] = useState(tabs[0].id);
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
        setErrorEliminar(data?.error ?? "No se pudo archivar el paciente");
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

  const visible =
    canViewAudit ? [...tabs, { id: "auditoria", label: "Auditoría" }] : tabs;

  if (!visible.some((t) => t.id === active)) setActive(visible[0].id);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Ficha clínica"
        title={patient.full_name}
        description={
          <>
            {patient.rut ?? "Sin RUT"} · {patient.sex && patient.sex !== "undisclosed" ? `${patient.sex === "female" ? "Mujer" : patient.sex === "male" ? "Hombre" : "Otro"} · ` : ""}
            {patient.birth_date ? `Nacido/a ${patient.birth_date.slice(0, 10)}` : "Fecha de nacimiento no registrada"}
            {patient.doctors?.full_name ? (
              <>
                {" "}
                · <span className="text-action-primary">Paciente de {patient.doctors.full_name}</span>
              </>
            ) : null}
          </>
        }
        meta={
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
              ESTADO_TONO[patient.patient_status] ?? ESTADO_TONO.inactive
            }`}
          >
            {estadoLabel(patient.patient_status)}
          </span>
        }
        actions={
          <>
            <a
              className={buttonClasses("primary", "sm")}
              href={`/api/ficha/patients/${patient.id}/pdf`}
              title="Descargar ficha en PDF"
            >
              <Download className="size-4" aria-hidden />
              Exportar ficha
            </a>
          </>
        }
      />

      <nav aria-label="Secciones de la ficha" className="relative flex flex-wrap gap-1 border-b border-neutral-200">
        {visible.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            aria-current={active === tab.id ? "page" : undefined}
            className={`relative rounded-t-lg px-3 py-2 text-sm font-medium transition-colors duration-micro ease-out-soft ${
              active === tab.id
                ? "text-action-primary"
                : "text-neutral-600 hover:bg-action-primary/5 hover:text-action-primary"
            }`}
          >
            {active === tab.id ? (
              <motion.span
                layoutId="ficha-tab-indicator"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-action-primary"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            ) : null}
            {tab.label}
          </button>
        ))}
      </nav>

      <div key={active} className="anim-view-fade">
      {active === "resumen" ? (
        <ResumenPanel patient={patient} orgType={orgType} canEdit={canEdit} />
      ) : active === "antecedentes" ? (
        <AntecedentesPanel patientId={patient.id} initial={background} />
      ) : active === "atenciones" ? (
        <AtencionesPanel
          patientId={patient.id}
          orgType={orgType}
          alertasTratamiento={
            typeof (patient.specialty_profile as Record<string, unknown> | null)?.treatmentAlerts ===
            "string"
              ? ((patient.specialty_profile as Record<string, unknown>).treatmentAlerts as string)
              : null
          }
        />
      ) : active === "odontograma" ? (
        <OdontogramaPanel patientId={patient.id} />
      ) : active === "periodoncia" ? (
        <PeriodontogramaPanel patientId={patient.id} />
      ) : active === "plan" ? (
        <PlanPanel patientId={patient.id} isAdmin={isAdmin} />
      ) : active === "recetas" ? (
        <RecetasPanel patientId={patient.id} />
      ) : active === "consentimientos" && (orgType === "psychological" || orgType === "medical") ? (
        <ConsentimientosPanel patientId={patient.id} orgType={orgType} />
      ) : active === "adjuntos" ? (
        <AdjuntosPanel
          patientId={patient.id}
          orgId={orgId}
          orgType={orgType}
          puedeEliminar={canEdit}
        />
      ) : active === "auditoria" ? (
        <AuditoriaPanel patientId={patient.id} isAdmin={isAdmin} puedeExportar={canEdit} />
      ) : null}
      </div>

      {active === "resumen" && canEdit ? (
        <section
          aria-labelledby="zona-peligrosa-paciente"
          className="rounded-card border border-red-200 bg-red-50/40 px-5 py-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="zona-peligrosa-paciente" className="text-sm font-semibold text-red-800">
                Zona peligrosa
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                Archiva al paciente sin borrar su ficha clínica. El paciente quedará inactivo y
                sus antecedentes se conservarán.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setErrorEliminar(null);
                setConfirmandoEliminar(true);
              }}
              className={buttonClasses("danger", "sm", "shrink-0")}
            >
              <Trash2 className="size-4" aria-hidden />
              Archivar paciente
            </button>
          </div>
        </section>
      ) : null}

      <Modal
        open={confirmandoEliminar}
        onClose={() => setConfirmandoEliminar(false)}
        title={`¿Archivar ${patient.full_name}?`}
        titleClassName="text-lg font-bold text-action-primary"
        size="md"
        panelClassName="border-transparent shadow-card"
        busy={eliminando}
      >
        <p className="mt-2 text-sm text-neutral-600">
          El paciente quedará inactivo. Su ficha y los registros clínicos se conservarán y seguirán
          sujetos a los permisos habituales.
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
            {eliminando ? "Archivando…" : "Archivar paciente"}
          </button>
        </div>
      </Modal>
    </div>
  );
}