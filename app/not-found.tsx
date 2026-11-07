import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, House, LayoutDashboard, SearchX } from "lucide-react";
import { buttonClasses } from "@/components/ui";

export const metadata: Metadata = {
  title: "No encontramos esta página",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-neutral-50 px-4 py-5 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-44 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-brand-sky-50 blur-3xl" />
        <div className="absolute -right-32 -bottom-40 h-96 w-96 rounded-full bg-brand-navy-50 blur-3xl" />
      </div>

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
        <Link href="/" className="group flex min-w-0 flex-col rounded-lg leading-tight">
          <span className="text-sm font-bold text-action-primary">Agenda online</span>
          <span className="text-xs text-neutral-600">Clínica odontológica</span>
        </Link>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-action-primary shadow-xs transition-colors duration-micro ease-out-soft hover:bg-action-primary/5"
        >
          <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
          Entrar al panel
        </Link>
      </header>

      <div className="anim-fade-up mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center py-14 text-center">
        <div className="relative mb-5" aria-hidden="true">
          <span className="absolute -inset-x-12 -inset-y-2 rounded-full bg-brand-sky-50 blur-2xl" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-sky-200 bg-white text-action-primary shadow-card">
            <SearchX className="h-6 w-6" strokeWidth={1.8} />
          </span>
        </div>

        <p className="text-[11px] font-semibold tracking-[0.18em] text-action-primary uppercase">
          Error 404
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-brand-navy text-balance sm:text-4xl">
          No encontramos esta página
        </h1>
        <p className="mt-3 max-w-md text-sm text-neutral-600 sm:text-base">
          El enlace puede estar incompleto o la página cambió de dirección. Si venías a reservar o
          a gestionar una cita, revisa el enlace del correo de confirmación; si sigue sin
          funcionar, pídele uno nuevo al equipo de tu clínica.
        </p>

        <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Link href="/" className={buttonClasses("primary", "lg")}>
            <House className="h-4 w-4" aria-hidden="true" />
            Ir al inicio
          </Link>
          <Link href="/reservar" className={buttonClasses("ghost", "lg")}>
            <CalendarCheck className="h-4 w-4" aria-hidden="true" />
            Reservar una hora
          </Link>
        </div>
      </div>

      <footer className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 border-t border-neutral-200 pt-4 text-xs text-neutral-600">
        <p>Agenda online · Clínica odontológica</p>
        <nav aria-label="Legal" className="flex items-center gap-4">
          <Link
            href="/politica-privacidad"
            className="transition-colors duration-micro ease-out-soft hover:text-action-primary"
          >
            Privacidad
          </Link>
          <Link
            href="/terminos"
            className="transition-colors duration-micro ease-out-soft hover:text-action-primary"
          >
            Términos
          </Link>
        </nav>
      </footer>
    </div>
  );
}
