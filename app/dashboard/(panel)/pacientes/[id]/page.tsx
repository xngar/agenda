import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDoctorSession, isClinical } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/ui";
import { auditPatientView } from "@/lib/ficha/http";
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

  if (!isClinical(session)) {
    return (
      <Card>
        <EmptyState
          icon="correo"
          title="Solo el equipo clínico abre fichas"
          description="Como persona de recepción puedes ver el listado de pacientes con sus datos de contacto y la agenda, pero no el contenido clínico."
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

  const auditContext = { session, supabase, clinical: true };
  for (const entity of ["patients", "patient_background"]) {
    const auditError = await auditPatientView(auditContext, id, entity);
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

  const bg = patient.patient_medical_background;
  const background = Array.isArray(bg) ? (bg[0] ?? null) : (bg ?? null);

  return (
    <FichaTabs
      patient={patient}
      background={background}
      orgType={orgType as OrganizationType}
      orgId={session.orgId}
      isAdmin={session.isAdmin}
      canEdit={session.isAdmin || patient.doctor_id === session.id}
      canViewAudit={
        session.isAdmin || session.isSuperAdmin || patient.doctor_id === session.id
      }
    />
  );
}