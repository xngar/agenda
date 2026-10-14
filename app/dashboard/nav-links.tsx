"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function CalendarioIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

function PacientesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M17.5 14.5c2.3.4 4 2.1 4 4.5" />
    </svg>
  );
}

function HorarioIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" />
    </svg>
  );
}

function BloqueosIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M5.5 5.5l13 13" strokeLinecap="round" />
    </svg>
  );
}

function EquipoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <circle cx="8" cy="8" r="3" />
      <path d="M2.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M15 5.5a3 3 0 0 1 0 5.8M17.5 14.7c1.9.7 3 2.1 3 4" strokeLinecap="round" />
    </svg>
  );
}

function ServiciosIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="3" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" />
    </svg>
  );
}

function FeriadosIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M5 21V4" strokeLinecap="round" />
      <path d="M5 4c4-2 8 2 13 0v9c-5 2-9-2-13 0" strokeLinejoin="round" />
    </svg>
  );
}

function OrganizacionesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3" strokeLinecap="round" />
    </svg>
  );
}

function DisponibilidadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="M12 13.5v2.2l1.5.9" strokeLinecap="round" />
    </svg>
  );
}

function PerfilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
    </svg>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const principal: NavItem[] = [
  { href: "/dashboard", label: "Agenda", icon: <CalendarioIcon /> },
  { href: "/dashboard/pacientes", label: "Pacientes", icon: <PacientesIcon /> },
];

const disponibilidadBase: NavItem[] = [
  { href: "/dashboard/horario", label: "Horario", icon: <HorarioIcon /> },
  { href: "/dashboard/bloqueos", label: "Bloqueos", icon: <BloqueosIcon /> },
];

const feriadosItem: NavItem = { href: "/dashboard/feriados", label: "Feriados", icon: <FeriadosIcon /> };

const miPerfil: NavItem = { href: "/dashboard/perfil", label: "Mi perfil", icon: <PerfilIcon /> };

const soloAdmin: NavItem[] = [
  { href: "/dashboard/admin", label: "Equipo", icon: <EquipoIcon /> },
  { href: "/dashboard/servicios", label: "Servicios", icon: <ServiciosIcon /> },
];

const soloSuperAdmin: NavItem[] = [
  { href: "/dashboard/plataforma/organizaciones", label: "Organizaciones", icon: <OrganizacionesIcon /> },
];

function navButtonClasses(active: boolean): string {
  return `inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    active ? "bg-brand-navy text-white" : "text-neutral-700 hover:bg-neutral-100"
  }`;
}

function esActivo(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}

export function NavLinks({
  isAdmin,
  isSuperAdmin = false,
}: {
  isAdmin: boolean;
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();

  if (isSuperAdmin) {
    return (
      <nav aria-label="Secciones del panel">
        <ul className="flex items-center gap-1">
          {soloSuperAdmin.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={esActivo(pathname, item.href) ? "page" : undefined}
                className={navButtonClasses(esActivo(pathname, item.href))}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  // Horario, Bloqueos y Feriados definen cuándo se puede reservar y cuándo
  // no: viven juntos en el desplegable "Disponibilidad". Feriados es
  // solo-admin, así que el resto del equipo ve 2 ítems en vez de 3.
  const disponibilidad = isAdmin ? [...disponibilidadBase, feriadosItem] : disponibilidadBase;
  const grupoActivo = disponibilidad.some((item) => esActivo(pathname, item.href));
  const enlacesFinales = isAdmin ? soloAdmin : [];

  return (
    <nav aria-label="Secciones del panel">
      <ul className="flex items-center gap-1">
        {principal.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={esActivo(pathname, item.href) ? "page" : undefined}
              className={navButtonClasses(esActivo(pathname, item.href))}
            >
              {item.icon}
              {item.label}
            </Link>
          </li>
        ))}

        <li>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-haspopup="menu"
              className={`${navButtonClasses(grupoActivo)} group cursor-pointer`}
            >
              <DisponibilidadIcon />
              Disponibilidad
              <ChevronDown
                aria-hidden="true"
                className="h-3.5 w-3.5 opacity-70 transition-transform group-data-[state=open]:rotate-180"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {disponibilidad.map((item) => {
                const active = esActivo(pathname, item.href);
                return (
                  <DropdownMenuItem key={item.href} asChild className={active ? "bg-neutral-100 font-semibold" : undefined}>
                    <Link href={item.href} aria-current={active ? "page" : undefined}>
                      {item.icon}
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </li>

        {[...enlacesFinales, miPerfil].map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={esActivo(pathname, item.href) ? "page" : undefined}
              className={navButtonClasses(esActivo(pathname, item.href))}
            >
              {item.icon}
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}