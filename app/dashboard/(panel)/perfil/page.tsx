import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireDoctor } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { PerfilForm } from "./perfil-form";
import { PerfilPasswordForm } from "./perfil-password-form";

export const dynamic = "force-dynamic";

/**
 * Mi perfil: nombre, especialidad y contraseña propia.
 *
 * Disponible para todo usuario del panel (profesional, recepción y admin
 * de la organización). El super-admin no opera clínicas y vive en el área
 * de plataforma (`/dashboard/plataforma/seguridad`).
 */
export default async function PerfilPage() {
  const session = await requireDoctor();
  if (session.isSuperAdmin) redirect("/dashboard/plataforma/organizaciones");

  const supabase = await supabaseServer();
  const { data: doctor } = await supabase
    .from("doctors")
    .select("full_name, specialty, role, is_admin")
    .eq("id", session.id)
    .maybeSingle();

  const roleLabel =
    doctor?.role === "reception" ? "Recepción" : session.isAdmin ? "Administrador" : "Profesional";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">Mi perfil</h1>
        <p className="text-sm text-neutral-600">
          {roleLabel}. Estos datos identifican tu cuenta dentro de la clínica.
        </p>
      </div>

      <PerfilForm
        initialName={doctor?.full_name ?? session.full_name}
        initialSpecialty={doctor?.specialty ?? session.specialty}
        role={doctor?.role === "reception" ? "reception" : "professional"}
      />

      <PerfilPasswordForm />

      <p className="text-sm text-neutral-500">
        Para cambiar tu correo de acceso, pide ayuda a quien administre el equipo o al equipo de
        la plataforma.{" "}
        <Link className="underline underline-offset-4 hover:text-brand-navy" href="/dashboard">
          Volver a la agenda
        </Link>
      </p>
    </div>
  );
}
