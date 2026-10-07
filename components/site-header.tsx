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
          className="group flex min-w-0 items-center rounded-lg"
          aria-label="Ir al inicio"
        >
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