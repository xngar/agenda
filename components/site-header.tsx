import Link from "next/link";
import { buttonClasses } from "./ui";
import { DEFAULT_BRAND, type ClinicBrand } from "@/lib/clinic";

export default function SiteHeader({ brand = DEFAULT_BRAND }: { brand?: ClinicBrand }) {
  const base = brand.slug ? `/${brand.slug}` : "";
  const homeHref = base || "/";
  const reservarHref = `${base}/reservar`;
  const privacidadHref = `${base}/privacidad`;

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href={homeHref}
          className="group flex min-w-0 items-center gap-2.5 rounded-lg"
          aria-label="Ir al inicio"
        >
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.9}>
              <path d="M12 3c-2 0-3 1-5 1S4 5 4 5c-1 2-1 5 0 8s2 8 4 8 2-4 4-4 2 4 4 4 3-5 4-8 1-6 0-8c0 0-2 1-3 1s-3-1-5-1Z" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold leading-tight text-brand-navy">
              {brand.name}
            </span>
            <span className="block truncate text-xs leading-tight text-neutral-600">
              Agenda online
            </span>
          </span>
        </Link>

        <nav aria-label="Principal" className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href={privacidadHref}
            className="hidden rounded-lg px-2 py-2 text-sm font-medium text-neutral-700 hover:bg-brand-navy-50 hover:text-brand-navy sm:inline-flex"
          >
            Privacidad
          </Link>
          <Link href={reservarHref} className={buttonClasses("primary", "sm")}>
            Reservar hora
          </Link>
        </nav>
      </div>
    </header>
  );
}