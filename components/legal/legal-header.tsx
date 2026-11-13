"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, Menu, X, Shield, FileText, Cookie } from "lucide-react";
import { useState } from "react";
import { siteConfig } from "@/lib/site-config";

const legalTabs = [
  { href: "/politica-privacidad", label: "Privacidad", icon: Shield },
  { href: "/terminos", label: "Términos", icon: FileText },
  { href: "/politica-cookies", label: "Cookies", icon: Cookie },
];

export default function LegalHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const brandName = siteConfig.name !== "[Nombre]" ? siteConfig.name : "gethour";

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group" aria-label="Ir al inicio">
            <Image
              src="/gethour.svg"
              alt={brandName}
              width={130}
              height={26}
              className="h-6 w-auto transition-transform group-hover:scale-102"
              priority
            />
          </Link>

          {/* Desktop Legal Tabs */}
          <nav aria-label="Páginas legales" className="hidden lg:flex items-center gap-1 rounded-full bg-neutral-100 p-1">
            {legalTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href || (tab.href === "/terminos" && pathname === "/terminos-y-condiciones") || (tab.href === "/politica-cookies" && pathname === "/cookies");
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-white text-[var(--lp-navy)] shadow-xs font-semibold"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-white/50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right action buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al inicio
          </Link>
          <Link
            href="/dashboard/login"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--lp-navy)] px-4 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[var(--lp-blue)] shadow-xs"
          >
            <span>Acceso clínicas</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((prev) => !prev)}
          className="rounded-lg p-1.5 text-neutral-700 hover:bg-neutral-100 lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <div className="border-t border-neutral-200 bg-white px-4 py-4 lg:hidden">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
            Documentos legales
          </div>
          <div className="flex flex-col gap-1 mb-4">
            {legalTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive
                      ? "bg-neutral-100 text-[var(--lp-navy)] font-semibold"
                      : "text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
          <div className="pt-3 border-t border-neutral-100 flex flex-col gap-2">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 py-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Link>
            <Link
              href="/dashboard/login"
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-[var(--lp-navy)] px-4 py-2 text-sm font-semibold text-white"
            >
              Acceso clínicas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

