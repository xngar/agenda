import "server-only";

import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { NewServiceButton } from "./service-form";
import { ServiceList } from "./service-list";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackLink } from "@/components/dashboard/back-link";

export const dynamic = "force-dynamic";

export default async function ServiciosPage() {
  const session = await requireAdmin();
  const supabase = await supabaseServer();

  const { data: services } = await supabase
    .from("services")
    .select("id, name, duration_min, active")
    .eq("org_id", session.orgId)
    .order("name");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuración"
        title="Servicios"
        description="Configura los servicios que aparecerán en el asistente de reserva. Los cambios afectan las nuevas reservas, no las citas ya agendadas."
        actions={<NewServiceButton />}
      />

      <ServiceList initial={services ?? []} />

      <BackLink />
    </div>
  );
}
