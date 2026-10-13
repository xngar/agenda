"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

const items = [
  { href: "/dashboard", label: "Agenda", icon: <CalendarioIcon /> },
  { href: "/dashboard/pacientes", label: "Pacientes", icon: <PacientesIcon /> },
  { href: "/dashboard/horario", label: "Horario", icon: <HorarioIcon /> },
  { href: "/dashboard/bloqueos", label: "Bloqueos", icon: <BloqueosIcon /> },
];

const soloAdmin = [
  { href: "/dashboard/admin", label: "Equipo", icon: <EquipoIcon /> },
  { href: "/dashboard/servicios", label: "Servicios", icon: <ServiciosIcon /> },
  { href: "/dashboard/feriados", label: "Feriados", icon: <FeriadosIcon /> },
];

const soloSuperAdmin = [
  { href: "/dashboard/plataforma/organizaciones", label: "Organizaciones", icon: <OrganizacionesIcon /> },
];

export function NavLinks({
  isAdmin,
  isSuperAdmin = false,
}: {
  isAdmin: boolean;
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();

  const visible = isSuperAdmin
    ? soloSuperAdmin
    : [...items, ...(isAdmin ? soloAdmin : [])];

  return (
    <nav aria-label="Secciones del panel">
      <ul className="flex items-center gap-1">
        {visible.map((item) => {
          const active =
            item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-navy text-white"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}