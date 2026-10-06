import "server-only";

import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { HolidaysEditor } from "./holidays-editor";

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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">Feriados</h1>
        <p className="text-sm text-neutral-600">
          Días en los que la clínica no atiende: el asistente no ofrece horas a ningún
          profesional.
        </p>
      </div>

      <HolidaysEditor initial={holidays} />

      <p className="text-sm text-neutral-500">
        <Link className="underline underline-offset-4 hover:text-brand-navy" href="/dashboard">
          Volver a la agenda
        </Link>
      </p>
    </div>
  );
}