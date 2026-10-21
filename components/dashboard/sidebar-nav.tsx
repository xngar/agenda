"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function CalendarioIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

function PacientesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M17.5 14.5c2.3.4 4 2.1 4 4.5" />
    </svg>
  );
}

function HorarioIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" />
    </svg>
  );
}

function BloqueosIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M5.5 5.5l13 13" strokeLinecap="round" />
    </svg>
  );
}

function EquipoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <circle cx="8" cy="8" r="3" />
      <path d="M2.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M15 5.5a3 3 0 0 1 0 5.8M17.5 14.7c1.9.7 3 2.1 3 4" strokeLinecap="round" />
    </svg>
  );
}

function ServiciosIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="3" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" />
    </svg>
  );
}

function FeriadosIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M5 21V4" strokeLinecap="round" />
      <path d="M5 4c4-2 8 2 13 0v9c-5 2-9-2-13 0" strokeLinejoin="round" />
    </svg>
  );
}

function OrganizacionesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3" strokeLinecap="round" />
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

const soloAdmin: NavItem[] = [
  { href: "/dashboard/admin", label: "Equipo", icon: <EquipoIcon /> },
  { href: "/dashboard/servicios", label: "Servicios", icon: <ServiciosIcon /> },
];

const soloSuperAdmin: NavItem[] = [
  { href: "/dashboard/plataforma/organizaciones", label: "Organizaciones", icon: <OrganizacionesIcon /> },
];

function esActivo(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}

function navButtonClasses(active: boolean): string {
  const tone = active
    ? "bg-panel-active text-brand-navy shadow-[inset_0_0_0_1px_var(--panel-line)]"
    : "text-panel-muted hover:bg-panel-hover hover:text-panel-ink";

  return `flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors duration-micro ease-out-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy ${tone}`;
}

function NavItems({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map((item) => {
        const active = esActivo(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={navButtonClasses(active)}
            >
              {item.icon}
              {item.label}
            </Link>
          </li>
        );
      })}
    </>
  );
}

export function SidebarNav({
  isAdmin,
  isSuperAdmin = false,
  onNavigate,
  className,
}: {
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const disponibilidad = isAdmin ? [...disponibilidadBase, feriadosItem] : disponibilidadBase;
  const enlacesAdmin = isAdmin ? soloAdmin : [];

  if (isSuperAdmin) {
    return (
      <nav aria-label="Secciones del panel" className={className}>
        <ul className="space-y-1">
          <NavItems items={soloSuperAdmin} pathname={pathname} onNavigate={onNavigate} />
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Secciones del panel" className={className}>
      <ul className="space-y-1">
        <NavItems items={principal} pathname={pathname} onNavigate={onNavigate} />
        <NavItems items={disponibilidad} pathname={pathname} onNavigate={onNavigate} />

        {enlacesAdmin.length > 0 ? (
          <li aria-hidden="true" className="my-3 h-px bg-panel-line" />
        ) : null}

        <NavItems items={enlacesAdmin} pathname={pathname} onNavigate={onNavigate} />
      </ul>
    </nav>
  );
}
