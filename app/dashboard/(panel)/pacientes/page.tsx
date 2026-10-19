import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getDoctorSession, getOrgSettings, isClinical } from "@/lib/auth";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/dashboard/page-header";
import { PatientsSearch } from "./patients-search";
import { NewPatientButton } from "./patient-form";
import { PatientsList, type PatientSort } from "./patients-list";
import { PatientsSkeleton } from "./patients-skeleton";

const SORT_COLUMNS = ["full_name", "rut", "birth_date", "patient_status"] as const;

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; sort?: string; dir?: string }>;
}) {
  const session = await getDoctorSession();
  if (!session) redirect("/dashboard/login");
  const clinical = isClinical(session);
  const org = await getOrgSettings(session.orgId);

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status =
    params.status === "active" || params.status === "inactive" || params.status === "abandoned"
      ? params.status
      : null;
  const page = Math.max(1, parseInt(params.page ?? "", 10) || 1);
  const sort = (SORT_COLUMNS as readonly string[]).includes(params.sort ?? "")
    ? (params.sort as PatientSort)
    : "full_name";
  const dir: "asc" | "desc" = params.dir === "desc" ? "desc" : "asc";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clínica"
        title="Pacientes"
        description={
          clinical
            ? "Fichas clínicas de tu organización. Registra los tuyos y edita los que te pertenecen."
            : "Datos de contacto de tu organización (agenda y atención)."
        }
        actions={clinical ? <NewPatientButton /> : undefined}
      />

      <Card className="px-4 py-3">
        <PatientsSearch initialQ={q} initialStatus={status} />
      </Card>

      <Suspense fallback={<PatientsSkeleton />}>
        <PatientsList
          orgId={session.orgId}
          orgName={org.name}
          clinical={clinical}
          q={q}
          status={status}
          page={page}
          sort={sort}
          dir={dir}
        />
      </Suspense>
    </div>
  );
}