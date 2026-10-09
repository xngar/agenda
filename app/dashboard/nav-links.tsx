"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Agenda" },
  { href: "/dashboard/pacientes", label: "Pacientes" },
  { href: "/dashboard/horario", label: "Horario" },
  { href: "/dashboard/bloqueos", label: "Bloqueos" },
];

const soloAdmin = [
  { href: "/dashboard/admin", label: "Equipo" },
  { href: "/dashboard/servicios", label: "Servicios" },
  { href: "/dashboard/feriados", label: "Feriados" },
];

const soloSuperAdmin = [{ href: "/dashboard/plataforma/organizaciones", label: "Organizaciones" }];

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
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-navy text-white"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}