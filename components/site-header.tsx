"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { buttonClasses } from "./ui";
import { DEFAULT_BRAND, type ClinicBrand } from "@/lib/clinic";
import ManageAppointmentModal from "@/components/booking/manage-appointment-modal";

export default function SiteHeader({ brand = DEFAULT_BRAND }: { brand?: ClinicBrand }) {
  const base = brand.slug ? `/${brand.slug}` : "";
  const homeHref = base || "/";
  const reservarHref = `${base}/reservar`;
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href={homeHref}
          className="group flex min-w-0 items-center rounded-lg"
          aria-label="Ir al inicio"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold leading-tight text-action-primary">
              {brand.name}
            </span>
            <span className="block truncate text-xs leading-tight text-neutral-600">
              Agenda online
            </span>
          </span>
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-1.5 sm:gap-3 md:flex">
          {brand.slug ? (
            <ManageAppointmentModal
              clinicSlug={brand.slug}
              clinicName={brand.name}
              variant="nav"
            >
              Gestionar o cancelar cita
            </ManageAppointmentModal>
          ) : null}
          <Link href={reservarHref} className={buttonClasses("primary", "sm")}>
            Reservar hora
          </Link>
        </nav>

        <button
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-700 transition-colors hover:bg-neutral-100 md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-neutral-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-2" onClick={() => setOpen(false)}>
            {brand.slug ? (
              <ManageAppointmentModal
                clinicSlug={brand.slug}
                clinicName={brand.name}
                variant="nav"
              >
                Gestionar o cancelar cita
              </ManageAppointmentModal>
            ) : null}
            <Link
              href={reservarHref}
              className={buttonClasses("primary", "md", "w-full")}
              onClick={() => setOpen(false)}
            >
              Reservar hora
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}