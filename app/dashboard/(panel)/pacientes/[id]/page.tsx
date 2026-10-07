import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDoctorSession, isClinical } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/ui";
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

  const bg = patient.patient_medical_background;
  const background = Array.isArray(bg) ? (bg[0] ?? null) : (bg ?? null);

  return (
    <FichaTabs
      patient={patient}
      background={background}
      orgType={(org.data?.type as OrganizationType) ?? "dental"}
      orgId={session.orgId}
      isAdmin={session.isAdmin}
      canEdit={session.isAdmin || patient.doctor_id === session.id}
    />
  );
}