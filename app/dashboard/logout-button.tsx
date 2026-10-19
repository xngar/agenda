"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function onClick() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/dashboard/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-600 transition-colors hover:border-danger-200 hover:bg-danger-50 hover:text-danger-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
