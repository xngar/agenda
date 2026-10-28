"use client";

import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PerfilTrigger } from "./(panel)/perfil/perfil-sheet-provider";

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

function EstadisticasIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M4 20V10M10 20V5M16 20v-7M21 20H3" strokeLinecap="round" />
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
  { href: "/dashboard/estadisticas", label: "Estadísticas", icon: <EstadisticasIcon /> },
];

const disponibilidadBase: NavItem[] = [
  { href: "/dashboard/horario", label: "Horario", icon: <HorarioIcon /> },
  { href: "/dashboard/bloqueos", label: "Bloqueos", icon: <BloqueosIcon /> },
];

const feriadosItem: NavItem = { href: "/dashboard/feriados", label: "Feriados", icon: <FeriadosIcon /> };

const PERFIL_ACTIVO = "/dashboard/perfil";

const soloAdmin: NavItem[] = [
  { href: "/dashboard/admin", label: "Equipo", icon: <EquipoIcon /> },
  { href: "/dashboard/servicios", label: "Servicios", icon: <ServiciosIcon /> },
];

const soloSuperAdmin: NavItem[] = [
  { href: "/dashboard/plataforma/organizaciones", label: "Organizaciones", icon: <OrganizacionesIcon /> },
];

function navButtonClasses(active: boolean): string {
  return `relative inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-sm font-medium transition-colors duration-micro ease-out-soft ${
    active
      ? "text-white"
      : "text-neutral-700 hover:bg-neutral-100 hover:text-brand-navy"
  }`;
}

/**
 * Fondo del ítem activo. Se dibuja como un elemento con `layoutId` para que
 * se desplace suavemente de un ítem a otro en vez de aparecer de golpe.
 */
function IndicadorActivo() {
  return (
    <motion.span
      layoutId="nav-indicador-activo"
      className="absolute inset-0 -z-10 rounded-lg bg-brand-navy shadow-[0_1px_2px_rgba(11,60,122,0.3)]"
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
    />
  );
}

function mobileButtonClasses(active: boolean): string {
  return `flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition-colors ${
    active ? "bg-brand-navy text-white" : "text-neutral-800 hover:bg-neutral-100"
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
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    menuPanelRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Horario, Bloqueos y Feriados definen cuándo se puede reservar y cuándo
  // no: viven juntos en el desplegable "Disponibilidad". Feriados es
  // solo-admin, así que el resto del equipo ve 2 ítems en vez de 3.
  const disponibilidad = isAdmin ? [...disponibilidadBase, feriadosItem] : disponibilidadBase;
  const grupoActivo = disponibilidad.some((item) => esActivo(pathname, item.href));
  const enlacesFinales = isAdmin ? soloAdmin : [];

  const mobilePrincipal: NavItem[] = isSuperAdmin
    ? soloSuperAdmin
    : [...principal, ...disponibilidad];
  const mobileGroups: NavItem[][] = isSuperAdmin
    ? [mobilePrincipal]
    : [mobilePrincipal, enlacesFinales];

  return (
    <nav
      aria-label="Secciones del panel"
      className="relative z-30 flex min-w-0 flex-1 items-center justify-end"
    >
      {isSuperAdmin ? (
        <ul className="no-scrollbar mx-auto -my-1 hidden min-w-0 items-center gap-0.5 overflow-x-auto py-1 lg:flex">
          {soloSuperAdmin.map((item) => {
            const active = esActivo(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={navButtonClasses(active)}
                >
                  {active ? <IndicadorActivo /> : null}
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="no-scrollbar mx-auto -my-1 hidden min-w-0 items-center gap-0.5 overflow-x-auto py-1 lg:flex">
          {principal.map((item) => {
            const active = esActivo(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={navButtonClasses(active)}
                >
                  {active ? <IndicadorActivo /> : null}
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            );
          })}

          <li>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-haspopup="menu"
                className={`${navButtonClasses(grupoActivo)} group cursor-pointer`}
              >
                {grupoActivo ? <IndicadorActivo /> : null}
                <DisponibilidadIcon />
                Disponibilidad
                <ChevronDown
                  aria-hidden="true"
                  className="h-3.5 w-3.5 opacity-70 transition-transform duration-micro ease-out-soft group-data-[state=open]:rotate-180"
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

          {enlacesFinales.length > 0 ? (
            <li aria-hidden="true" className="mx-1 h-5 w-px bg-neutral-200" />
          ) : null}

          {enlacesFinales.map((item) => {
            const active = esActivo(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={navButtonClasses(active)}
                >
                  {active ? <IndicadorActivo /> : null}
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <button
        ref={menuButtonRef}
        type="button"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        aria-controls="menu-movil"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-neutral-300 bg-white text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy lg:hidden"
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Menu className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="fixed inset-0 -z-10 cursor-default bg-brand-navy-900/25 lg:hidden"
          />
          <div
            ref={menuPanelRef}
            id="menu-movil"
            style={{ transformOrigin: "top right" }}
            className="anim-menu absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-card border border-neutral-200 bg-white p-2 shadow-lift lg:hidden"
          >
            <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Navegación
            </p>
            <ul className="flex flex-col gap-0.5">
              {mobileGroups.map((grupo, indice) =>
                grupo.length > 0 ? (
                  <li
                    key={indice}
                    className={indice > 0 ? "mt-1 border-t border-neutral-200 pt-1" : undefined}
                  >
                    <ul className="flex flex-col gap-0.5">
                      {grupo.map((item) => {
                        const active = esActivo(pathname, item.href);
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              aria-current={active ? "page" : undefined}
                              onClick={() => setOpen(false)}
                              className={mobileButtonClasses(active)}
                            >
                              {item.icon}
                              {item.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ) : null,
              )}
            </ul>
            {!isSuperAdmin ? (
              <div className="mt-1 border-t border-neutral-200 pt-1">
                <PerfilTrigger
                  className={`${mobileButtonClasses(esActivo(pathname, PERFIL_ACTIVO))} w-full`}
                  title="Mi perfil"
                  onClick={() => setOpen(false)}
                >
                  <PerfilIcon />
                  Mi perfil
                </PerfilTrigger>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </nav>
  );
}

