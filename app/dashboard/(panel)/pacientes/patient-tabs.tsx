"use client";

import Link from "next/link";
import { Star, Users } from "lucide-react";

export function PatientTabs({
  activeTab,
  favoritesCount,
  q,
  status,
}: {
  activeTab: "all" | "favorites";
  favoritesCount: number;
  q?: string;
  status?: string | null;
}) {
  function makeHref(tab: "all" | "favorites") {
    const params = new URLSearchParams();
    if (tab === "favorites") params.set("tab", "favorites");
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    const qs = params.toString();
    return `/dashboard/pacientes${qs ? `?${qs}` : ""}`;
  }

  return (
    <nav aria-label="Filtro de pacientes" className="relative flex items-center gap-1 border-b border-neutral-200">
      <Link
        href={makeHref("all")}
        aria-current={activeTab === "all" ? "page" : undefined}
        className={`relative inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors duration-micro ease-out-soft ${
          activeTab === "all"
            ? "text-action-primary"
            : "text-neutral-600 hover:bg-action-primary/5 hover:text-action-primary"
        }`}
      >
        {activeTab === "all" ? (
          <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-action-primary" />
        ) : null}
        <Users className="size-4" />
        <span>Todos</span>
      </Link>

      <Link
        href={makeHref("favorites")}
        aria-current={activeTab === "favorites" ? "page" : undefined}
        className={`relative inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors duration-micro ease-out-soft ${
          activeTab === "favorites"
            ? "text-action-primary"
            : "text-neutral-600 hover:bg-action-primary/5 hover:text-action-primary"
        }`}
      >
        {activeTab === "favorites" ? (
          <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-action-primary" />
        ) : null}
        <Star
          className={`size-4 ${
            activeTab === "favorites"
              ? "fill-amber-400 text-amber-500"
              : "text-neutral-400"
          }`}
        />
        <span>Favoritos</span>
        {favoritesCount > 0 ? (
          <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
            {favoritesCount}
          </span>
        ) : null}
      </Link>
    </nav>
  );
}

