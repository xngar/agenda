"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { DEFAULT_BRAND, type ClinicBrand } from "@/lib/clinic";
import ManageAppointmentModal from "@/components/booking/manage-appointment-modal";

export default function SiteHeader({ brand = DEFAULT_BRAND }: { brand?: ClinicBrand }) {
  const base = brand.slug ? `/${brand.slug}` : "";
  const homeHref = base || "/";
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--lp-sky-200)]/70 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href={homeHref}
          className="group flex min-w-0 items-center rounded-xl"
          aria-label="Ir al inicio"
        >
          <Image
            src="/gethour.svg"
            alt={brand.name || "gethour"}
            width={140}
            height={28}
            className="h-7 w-auto transition-transform duration-micro group-hover:scale-102"
            priority
          />
        </Link>

        {brand.slug ? (
          <>
            <nav aria-label="Principal" className="hidden items-center gap-2.5 md:flex">
              <ManageAppointmentModal
                clinicSlug={brand.slug}
                clinicName={brand.name}
                variant="nav"
              >
                Gestionar o cancelar cita
              </ManageAppointmentModal>
            </nav>

            <button
              type="button"
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-neutral-200 bg-white text-[var(--lp-navy)] transition-colors hover:bg-sky-50/70 md:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </>
        ) : null}
      </div>

      {open && brand.slug ? (
        <div className="anim-menu border-t border-[var(--lp-sky-200)]/70 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-2" onClick={() => setOpen(false)}>
            <ManageAppointmentModal
              clinicSlug={brand.slug}
              clinicName={brand.name}
              variant="nav"
            >
              Gestionar o cancelar cita
            </ManageAppointmentModal>
          </div>
        </div>
      ) : null}
    </header>
  );
}