"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton({
  variant = "icon",
}: {
  variant?: "icon" | "sidebar";
}) {
  const router = useRouter();

  async function onClick() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/dashboard/login");
    router.refresh();
  }

  const className =
    variant === "sidebar"
      ? "flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-sm font-medium text-panel-muted transition-colors duration-micro ease-out-soft hover:bg-danger-50 hover:text-danger-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary"
      : "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-600 transition-colors hover:border-danger-200 hover:bg-danger-50 hover:text-danger-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
      className={className}
    >
      <LogOut className={variant === "sidebar" ? "h-[18px] w-[18px]" : "h-4 w-4"} aria-hidden="true" />
      {variant === "sidebar" ? <span>Cerrar sesión</span> : null}
    </button>
  );
}
