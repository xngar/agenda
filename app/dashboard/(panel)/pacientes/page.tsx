import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getDoctorSession, getOrgSettings, isClinical } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/dashboard/page-header";
import { PatientsSearch } from "./patients-search";
import { NewPatientButton } from "./patient-form";
import { PatientsList, type PatientSort } from "./patients-list";
import { PatientsSkeleton } from "./patients-skeleton";
import { PatientTabs } from "./patient-tabs";

const SORT_COLUMNS = ["full_name", "rut", "birth_date", "patient_status"] as const;

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; sort?: string; dir?: string; tab?: string }>;
}) {
  const session = await getDoctorSession();
  if (!session) redirect("/dashboard/login");
  const clinical = isClinical(session);
  const org = await getOrgSettings(session.orgId);
  const supabase = await supabaseServer();

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
  const tab: "all" | "favorites" = params.tab === "favorites" ? "favorites" : "all";

  // Conteo de favoritos del doctor actual
  const { count: favoritesCount } = await supabase
    .from("doctor_favorite_patients")
    .select("*", { count: "exact", head: true })
    .eq("doctor_id", session.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clínica"
        title="Pacientes"
        description={
          clinical
            ? "Fichas de los pacientes con relación asistencial contigo o con tu equipo."
            : "Datos de contacto de tu organización (agenda y atención)."
        }
        actions={clinical ? <NewPatientButton /> : undefined}
      />

      <PatientTabs
        activeTab={tab}
        favoritesCount={favoritesCount ?? 0}
        q={q}
        status={status}
      />

      <Card className="px-4 py-3">
        <PatientsSearch initialQ={q} initialStatus={status} />
      </Card>

      <Suspense fallback={<PatientsSkeleton />}>
        <PatientsList
          orgId={session.orgId}
          orgName={org.name}
          doctorId={session.id}
          clinical={clinical}
          q={q}
          status={status}
          tab={tab}
          page={page}
          sort={sort}
          dir={dir}
        />
      </Suspense>
    </div>
  );
}
