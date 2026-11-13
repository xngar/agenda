import Link from "next/link";
import { DEFAULT_BRAND, type ClinicBrand } from "@/lib/clinic";

export default function SiteFooter({ brand = DEFAULT_BRAND }: { brand?: ClinicBrand }) {
  const base = brand.slug ? `/${brand.slug}` : "";
  const reservarHref = `${base}/reservar`;
  const privacidadHref = `${base}/privacidad`;
  const address = brand.address ?? DEFAULT_BRAND.address;
  const phone = brand.phone ?? DEFAULT_BRAND.phone;
  const supportEmail = brand.supportEmail ?? DEFAULT_BRAND.supportEmail;

  return (
    <footer className="mt-16 border-t border-[var(--lp-sky-200)] bg-[var(--lp-navy)] text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="text-base font-bold text-white">{brand.name}</p>
          <p className="mt-2 text-sm text-white/80">
            Reserva y gestión de horas online sin intermediarios.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">Contacto</p>
          <address className="mt-2 space-y-1.5 text-sm not-italic text-white/80">
            <p>{address}</p>
            <p>
              <a
                href={`tel:${phone?.replace(/\s/g, "")}`}
                className="transition-colors hover:text-[var(--lp-sky-200)]"
              >
                {phone}
              </a>
            </p>
            {supportEmail ? (
              <p>
                <a
                  href={`mailto:${supportEmail}`}
                  className="transition-colors hover:text-[var(--lp-sky-200)]"
                >
                  {supportEmail}
                </a>
              </p>
            ) : null}
          </address>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">Enlaces</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li>
              <Link
                href={reservarHref}
                className="text-white/80 transition-colors hover:text-[var(--lp-sky-200)]"
              >
                Reservar hora
              </Link>
            </li>
            <li>
              <Link
                href={privacidadHref}
                className="text-white/80 transition-colors hover:text-[var(--lp-sky-200)]"
              >
                Aviso de privacidad
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard"
                className="text-white/80 transition-colors hover:text-[var(--lp-sky-200)]"
              >
                Acceso profesionales
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4 sm:px-6">
        <p className="mx-auto w-full max-w-6xl text-xs text-white/60">
          © {new Date().getFullYear()} {brand.name}. Datos tratados conforme a la Ley 19.628.
        </p>
      </div>
    </footer>
  );
}