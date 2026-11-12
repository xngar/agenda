"use client";

import React from "react";
import LegalHeader from "./legal-header";
import Footer from "@/components/landing/footer";
import { siteConfig } from "@/lib/site-config";
import {
  Calendar,
  MapPin,
  ShieldCheck,
  Printer,
  Mail,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export interface TocItem {
  id: string;
  title: string;
}

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  badge: string;
  lastUpdated?: string;
  toc: TocItem[];
  children: React.ReactNode;
}

export default function LegalLayout({
  title,
  subtitle,
  badge,
  lastUpdated = "Noviembre 2026",
  toc,
  children,
}: LegalLayoutProps) {
  const brandName = siteConfig.name !== "[Nombre]" ? siteConfig.name : "Agenda Online";

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50/50 text-neutral-800 antialiased">
      <LegalHeader />

      {/* Hero Header */}
      <section className="border-b border-neutral-200 bg-gradient-to-b from-white via-white to-neutral-50/60 pt-10 pb-12 sm:pt-14 sm:pb-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-[var(--lp-navy)]">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              <span>{badge}</span>
            </div>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
              {title}
            </h1>

            <p className="mt-4 text-base leading-relaxed text-neutral-600 sm:text-lg">
              {subtitle}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-neutral-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-neutral-400" />
                <span>Última actualización: {lastUpdated}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-neutral-400" />
                <span>Jurisdicción: República de Chile</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Ley 19.628 &amp; Ley 20.584</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Sticky Table of Contents (Desktop) */}
          <aside className="hidden lg:col-span-4 lg:block">
            <div className="sticky top-24 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <h2 className="text-sm font-bold tracking-tight text-neutral-900 uppercase">
                  Índice de contenidos
                </h2>
                <button
                  type="button"
                  onClick={handlePrint}
                  aria-label="Imprimir documento"
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Imprimir</span>
                </button>
              </div>

              <nav aria-label="Tabla de contenidos" className="mt-4 space-y-1">
                {toc.map((item, index) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-[var(--lp-navy)]"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="text-xs font-semibold text-neutral-400 group-hover:text-[var(--lp-navy)]">
                        {String(index + 1).padStart(2, "0")}.
                      </span>
                      <span className="truncate">{item.title}</span>
                    </span>
                    <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100 text-neutral-400" />
                  </a>
                ))}
              </nav>

              {/* Quick Contact Box */}
              <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--lp-navy)]">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span>¿Dudas o requerimientos?</span>
                </div>
                <p className="mt-1.5 text-xs text-neutral-600 leading-relaxed">
                  Para consultas legales, rectificación o eliminación de datos, contáctanos a:
                </p>
                <a
                  href={`mailto:${siteConfig.email !== "[correo]" ? siteConfig.email : "contacto@gethour.cl"}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                >
                  {siteConfig.email !== "[correo]" ? siteConfig.email : "contacto@gethour.cl"}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </aside>

          {/* Document Content */}
          <article className="lg:col-span-8">
            <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 sm:p-10 shadow-xs prose-legal">
              {children}
            </div>

            {/* Bottom Support Banner */}
            <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs sm:flex sm:items-center sm:justify-between sm:p-8">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Transparencia y Privacidad Primero
                </h3>
                <p className="mt-1 text-sm text-neutral-600">
                  En {brandName} protegemos la confidencialidad médica y los derechos de pacientes y profesionales.
                </p>
              </div>
              <div className="mt-4 sm:mt-0 sm:shrink-0">
                <a
                  href={`mailto:${siteConfig.email !== "[correo]" ? siteConfig.email : "contacto@gethour.cl"}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--lp-navy)] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[var(--lp-blue)]"
                >
                  <Mail className="h-4 w-4" />
                  Contáctanos por correo
                </a>
              </div>
            </div>
          </article>
        </div>
      </div>

      <Footer />
    </div>
  );
}

