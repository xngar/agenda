import "server-only";

import { redirect } from "next/navigation";
import { requireDoctor } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { RemindersConfigCard } from "../admin/reminders-config-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackLink } from "@/components/dashboard/back-link";

export const dynamic = "force-dynamic";

export default async function NotificacionesPage() {
  const session = await requireDoctor();
  if (session.isSuperAdmin) redirect("/dashboard/plataforma/organizaciones");

  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("doctors")
    .select("reminders_enabled, reminder_hours_before")
    .eq("id", session.id)
    .maybeSingle();

  const remindersEnabled =
    (data as { reminders_enabled?: boolean | null } | null)?.reminders_enabled ?? true;
  const reminderHours =
    (data as { reminder_hours_before?: number | null } | null)?.reminder_hours_before ?? 24;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuración"
        title="Notificaciones"
        description="Configura el envío automático de recordatorios por correo para tus pacientes con cita confirmada."
      />

      <RemindersConfigCard initialEnabled={remindersEnabled} initialHours={reminderHours} />

      <BackLink />
    </div>
  );
}

