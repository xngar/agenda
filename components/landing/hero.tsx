import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { CheckCircle2, Calendar, Users, Bell } from "lucide-react";

export default function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-gradient-to-b from-[var(--lp-sky-100)] via-white to-white pt-24"
    >
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--lp-navy)] shadow-sm ring-1 ring-[var(--lp-sky-200)]">
            Para odontólogos, médicos y psicólogos
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-[var(--lp-navy)] sm:text-5xl lg:text-6xl">
            Agenda, fichas clínicas y pacientes en un solo lugar.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-[var(--lp-navy)]/90">
            {siteConfig.name} es la plataforma para clínicas y profesionales de la salud que quieren ordenar su consulta: reservas online, ficha clínica adaptada a su especialidad y recordatorios automáticos para sus pacientes.
          </p>
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              "Reservas online",
              "Ficha clínica por especialidad",
              "Recordatorios automáticos",
              "Panel para tu equipo",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm font-medium text-[var(--lp-navy)]">
                <CheckCircle2 className="h-5 w-5 text-[var(--lp-blue)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="#demo"
              className="rounded-full bg-[var(--lp-navy)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--lp-blue)]"
            >
              Solicitar una demo
            </Link>
            <Link
              href={`mailto:${siteConfig.email}`}
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[var(--lp-navy)] shadow-sm ring-1 ring-[var(--lp-sky-200)] transition hover:bg-[var(--lp-sky-100)]"
            >
              Hablar con nuestro equipo
            </Link>
          </div>
        </div>
        <div className="relative">
          <div className="relative mx-auto max-w-lg rounded-2xl bg-white p-4 shadow-xl ring-1 ring-[var(--lp-sky-200)]">
            <div className="rounded-xl border border-[var(--lp-sky-200)] bg-gradient-to-b from-white to-[var(--lp-sky-100)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-[var(--lp-navy)]">Agenda semanal</div>
                <div className="text-xs text-[var(--lp-navy)]/70">Ejemplo</div>
              </div>
              <div className="grid grid-cols-5 gap-2 text-xs">
                {["L", "M", "X", "J", "V"].map((d) => (
                  <div key={d} className="text-center font-medium text-[var(--lp-navy)]/70">
                    {d}
                  </div>
                ))}
                {[0,1,2,3,4].map((i) => (
                  <div key={i} className="h-20 rounded-lg border border-[var(--lp-sky-200)] bg-white p-1">
                    <div className="text-[10px] text-[var(--lp-navy)]/50">{9 + i}:00</div>
                    {i === 1 ? (
                      <div className="mt-1 rounded-md bg-[var(--lp-yellow)]/40 px-1 py-0.5 text-[10px] font-medium text-[var(--lp-navy)]">
                        Paciente A
                      </div>
                    ) : null}
                    {i === 3 ? (
                      <div className="mt-1 rounded-md bg-[var(--lp-blue)]/10 px-1 py-0.5 text-[10px] font-medium text-[var(--lp-navy)]">
                        Paciente B
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm font-semibold text-[var(--lp-navy)]">Pacientes</div>
              <div className="mt-2 space-y-2">
                {["Paciente A · Odontología", "Paciente B · Medicina"].map((p) => (
                  <div key={p} className="flex items-center justify-between rounded-lg border border-[var(--lp-sky-200)] bg-white px-2 py-1.5 text-xs">
                    <span className="text-[var(--lp-navy)]">{p}</span>
                    <span className="text-[var(--lp-navy)]/60">09:00</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute -right-4 top-6 hidden rounded-lg bg-white px-3 py-2 text-xs font-medium shadow-lg ring-1 ring-[var(--lp-sky-200)] sm:block">
            <div className="flex items-center gap-2 text-[var(--lp-navy)]">
              <Bell className="h-4 w-4 text-[var(--lp-yellow)]" />
              Recordatorio enviado
            </div>
          </div>
          <div className="absolute -left-4 bottom-10 hidden rounded-lg bg-white px-3 py-2 text-xs font-medium shadow-lg ring-1 ring-[var(--lp-sky-200)] sm:block">
            <div className="flex items-center gap-2 text-[var(--lp-navy)]">
              <Calendar className="h-4 w-4 text-[var(--lp-blue)]" />
              Nueva reserva
            </div>
          </div>
          <div className="absolute -right-2 bottom-2 hidden rounded-lg bg-white px-3 py-2 text-xs font-medium shadow-lg ring-1 ring-[var(--lp-sky-200)] sm:block">
            <div className="flex items-center gap-2 text-[var(--lp-navy)]">
              <Users className="h-4 w-4 text-[var(--lp-navy)]" />
              Cita confirmada
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
