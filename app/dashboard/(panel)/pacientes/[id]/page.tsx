import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDoctorSession, isClinical } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/ui";
import { auditPatientView, patientAccess } from "@/lib/ficha/http";
import { FichaTabs } from "./ficha-tabs";
import type { OrganizationType } from "@/lib/ficha/types";

export const metadata: Metadata = {
  title: "Ficha del paciente",
  robots: { index: false, follow: false },
};

export default async function PacientePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getDoctorSession();
  if (!session) redirect("/dashboard/login");

  const { id } = await params;
  const clinical = isClinical(session);

  if (!clinical && session.role !== "reception") {
    return (
      <Card>
        <EmptyState
          icon="correo"
          title="No tienes acceso a fichas clínicas"
          description="Solo el equipo clínico y la recepción pueden abrir la ficha administrativa de un paciente."
        />
      </Card>
    );
  }

  const supabase = await supabaseServer();
  const { data: patient, error } = await supabase
    .from("patients")
    .select("*, doctors!patients_doctor_id_fkey (full_name), patient_medical_background (*)")
    .eq("org_id", session.orgId)
    .eq("id", id)
    .maybeSingle();

  if (error || !patient) {
    return (
      <Card>
        <EmptyState icon="diente" title="Paciente no encontrado" />
      </Card>
    );
  }

  const org = await supabase.from("organizations").select("type").eq("id", session.orgId).maybeSingle();
  const orgType = org.data?.type;
  if (
    org.error ||
    (orgType !== "dental" && orgType !== "medical" && orgType !== "psychological")
  ) {
    console.error("[ficha] No se pudo determinar el tipo de organización de la ficha");
    return (
      <Card>
        <EmptyState
          icon="correo"
          title="No se pudo cargar la ficha"
          description="No fue posible determinar el tipo de ficha de la organización. Intenta nuevamente o contacta a soporte."
        />
      </Card>
    );
  }

  const ctx = { session, supabase, clinical };
  const access = await patientAccess(ctx, patient);

  if (clinical && !access.canViewClinical) {
    return (
      <Card>
        <EmptyState
          icon="correo"
          title="Sin relación con la atención"
          description="Solo puedes abrir fichas de pacientes que tienes asignados o con quienes tienes una cita o atención registrada."
        />
      </Card>
    );
  }

  if (access.canViewClinical) {
    for (const entity of ["patients", "patient_background"]) {
      const auditError = await auditPatientView(ctx, id, entity);
      if (auditError) {
        console.error(`[ficha.audit] No se pudo registrar el acceso a ${entity}`);
        return (
          <Card>
            <EmptyState
              icon="correo"
              title="No se pudo abrir la ficha"
              description="No fue posible registrar el acceso a la información clínica. Intenta nuevamente."
            />
          </Card>
        );
      }
    }
  }

  const bg = patient.patient_medical_background;
  const background = Array.isArray(bg) ? (bg[0] ?? null) : (bg ?? null);

  return (
    <FichaTabs
      patient={patient}
      background={background}
      orgType={orgType as OrganizationType}
      orgId={session.orgId}
      isAdmin={session.isAdmin}
      canEdit={access.canEditIdentity}
      canEditProfile={access.canEditClinical}
      canDelete={access.canDelete}
      canViewAudit={access.canViewAudit}
      canExport={access.canViewClinical}
      administrative={access.isReception}
    />
  );
}
