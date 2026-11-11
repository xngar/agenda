"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, X, ArrowRight } from "lucide-react";
import { useState } from "react";
import { siteConfig } from "@/lib/site-config";

const links = [
  { href: "#funciones", label: "Funciones" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#seguridad", label: "Seguridad" },
  { href: "#planes", label: "Planes" },
  { href: "#preguntas", label: "Preguntas" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/20 backdrop-blur-md">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="#top" className="flex items-center gap-2">
          <Image
            src="/gethour.svg"
            alt={siteConfig.name !== "[Nombre]" ? siteConfig.name : "gethour"}
            width={140}
            height={28}
            className="h-7 w-auto drop-shadow-sm brightness-0 invert"
            priority
          />
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-white/90 drop-shadow-xs transition hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/dashboard/login"
            className="group inline-flex items-center gap-1.5 rounded-full bg-[var(--lp-navy)] px-4 py-2 text-sm font-semibold text-white shadow-xs transition-all duration-micro hover:scale-105 hover:bg-[var(--lp-blue)] hover:shadow-sm active:scale-95"
          >
            <span>Acceso profesionales</span>
            <ArrowRight className="h-4 w-4 btn-icon-right" aria-hidden="true" />
          </Link>
        </div>
        <button
          type="button"
          aria-label="Abrir menú"
          className="rounded-lg p-1.5 text-white transition-transform duration-micro hover:scale-110 active:scale-90 md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>
      {open ? (
        <div className="md:hidden">
          <div className="flex flex-col gap-2 border-t border-white/10 bg-black/80 px-4 py-3 backdrop-blur-md">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="py-1 text-sm font-medium text-white/90 hover:text-white"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/dashboard/login"
              className="mt-1 rounded-full bg-[var(--lp-navy)] px-4 py-2 text-center text-sm font-semibold text-white"
              onClick={() => setOpen(false)}
            >
              Acceso profesionales
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
