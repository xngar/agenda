import "server-only";

import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { ServiceForm } from "./service-form";
import { ServiceList } from "./service-list";

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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">Servicios</h1>
        <p className="text-sm text-neutral-600">
          Configura los servicios que aparecerán en el asistente de reserva. Los cambios afectan las nuevas reservas, no las citas ya agendadas.
        </p>
      </div>

      <ServiceForm onCancel={() => {}} />

      <ServiceList initial={services ?? []} />

      <p className="text-sm text-neutral-500">
        <Link className="underline underline-offset-4 hover:text-brand-navy" href="/dashboard">
          Volver a la agenda
        </Link>
      </p>
    </div>
  );
}
