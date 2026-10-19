import "server-only";

import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { HolidaysEditor } from "./holidays-editor";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackLink } from "@/components/dashboard/back-link";

export const dynamic = "force-dynamic";

/**
 * Feriados de la clínica: días sin atención para todo el equipo.
 *
 * El asistente público no ofrece horas esos días (migración 0001), igual que
 * los bloqueos individuales pero a nivel de clínica. Sólo la administradora
 * los administra: `requireAdmin()` redirige al resto.
 */
export default async function FeriadosPage() {
  await requireAdmin();
  const supabase = await supabaseServer();

  const { data } = await supabase
    .from("clinic_holidays")
    .select("date, name")
    .order("date");

  const holidays = (data ?? []).map((h) => ({
    date: h.date as string,
    name: h.name as string | null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Disponibilidad"
        title="Feriados"
        description="Días en los que la clínica no atiende: el asistente no ofrece horas a ningún profesional."
      />

      <HolidaysEditor initial={holidays} />

      <BackLink />
    </div>
  );
}