import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackLink } from "@/components/dashboard/back-link";
import { ImportPacientesForm } from "./import-pacientes-form";

export default async function ImportarPacientesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;
  const supabase = supabaseAdmin();

  const { data: org } = await supabase
    .from("organizations")
    .select("id,name,slug")
    .eq("id", id)
    .maybeSingle();

  if (!org) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Plataforma · Importación"
        title={`Importar pacientes — ${org.name}`}
        description="Sube un archivo CSV con los pacientes existentes de la clínica. Los RUTs duplicados se omiten automáticamente."
      />

      <ImportPacientesForm orgId={org.id} />

      <BackLink href={`/dashboard/plataforma/organizaciones/${id}`}>
        Volver a la organización
      </BackLink>
    </div>
  );
}

