import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";

export default async function PlataformaPage() {
  await requireSuperAdmin();
  redirect("/dashboard/plataforma/organizaciones");
}