"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
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
    <header className="fixed top-0 z-50 w-full border-b border-[var(--lp-sky-200)] bg-white/95 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="#top" className="flex items-center gap-2">
          <span className="text-lg font-bold text-[var(--lp-navy)]">{siteConfig.name}</span>
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-[var(--lp-navy)] transition hover:text-[var(--lp-blue)]"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="#demo"
            className="rounded-full bg-[var(--lp-navy)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--lp-blue)]"
          >
            Solicitar demo
          </Link>
        </div>
        <button
          type="button"
          aria-label="Abrir menú"
          className="md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>
      {open ? (
        <div className="md:hidden">
          <div className="flex flex-col gap-2 border-t border-[var(--lp-sky-200)] bg-white px-4 py-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="py-1 text-sm font-medium text-[var(--lp-navy)]"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="#demo"
              className="mt-1 rounded-full bg-[var(--lp-navy)] px-4 py-2 text-center text-sm font-semibold text-white"
              onClick={() => setOpen(false)}
            >
              Solicitar demo
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
