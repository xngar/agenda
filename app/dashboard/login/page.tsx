import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Acceso Institucional · GetHour",
  description: "Portal de acceso para profesionales y personal clínico de GetHour.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col justify-between bg-gradient-to-b from-neutral-50 via-slate-50/50 to-neutral-100/60 px-4 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-sm flex-col justify-center flex-1">
        {/* Encabezado institucional con logo GetHour */}
        <div className="flex flex-col items-center text-center mb-6">
          <Link
            href="/"
            aria-label="Ir al inicio"
            className="group mb-5 inline-flex items-center rounded-xl p-1 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary hover:opacity-90 active:scale-[0.98]"
          >
            <Image
              src="/gethour.svg"
              alt="GetHour"
              width={140}
              height={36}
              priority
              className="h-9 w-auto max-w-full drop-shadow-[0_1px_1px_rgba(0,0,0,0.04)]"
            />
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
            Portal Clínico
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-neutral-600">
            Acceso para profesionales y personal de salud
          </p>
        </div>

        {/* Tarjeta de acceso institucional */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 sm:p-7 shadow-sm ring-1 ring-neutral-900/5">
          <LoginForm />
        </div>

        {/* Garantía de seguridad */}
        <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-neutral-500">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
          <span>Acceso seguro cifrado con TLS de extremo a extremo</span>
        </div>
      </div>

      {/* Pie institucional */}
      <footer className="mt-8 text-center text-xs text-neutral-400">
        <p>© {new Date().getFullYear()} GetHour · Sistema de Gestión Clínica y Reservas</p>
      </footer>
    </div>
  );
}
