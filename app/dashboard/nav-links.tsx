"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [{ href: "/dashboard", label: "Agenda" }];

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const visible = isAdmin ? [...items, { href: "/dashboard/admin", label: "Equipo" }] : items;

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