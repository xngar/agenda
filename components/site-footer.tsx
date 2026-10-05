import Link from "next/link";
import { CLINIC_ADDRESS, CLINIC_PHONE } from "@/lib/clinic";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-neutral-200 bg-white">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="text-sm font-bold text-brand-navy">Sonrisa Dental</p>
          <p className="mt-2 text-sm text-neutral-600">
            Clínica odontológica en Santiago. Lunes a sábado.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-neutral-800">Contacto</p>
          <address className="mt-2 space-y-1 text-sm not-italic text-neutral-600">
            <p>{CLINIC_ADDRESS}</p>
            <p>
              <a href={`tel:${CLINIC_PHONE.replace(/\s/g, "")}`} className="hover:text-brand-navy">
                {CLINIC_PHONE}
              </a>
            </p>
          </address>
        </div>

        <div>
          <p className="text-sm font-semibold text-neutral-800">Enlaces</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li>
              <Link href="/reservar" className="text-neutral-600 hover:text-brand-navy">
                Reservar hora
              </Link>
            </li>
            <li>
              <Link href="/privacidad" className="text-neutral-600 hover:text-brand-navy">
                Aviso de privacidad
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="text-neutral-600 hover:text-brand-navy">
                Acceso profesionales
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-neutral-200 px-4 py-4 sm:px-6">
        <p className="mx-auto w-full max-w-6xl text-xs text-neutral-500">
          © {new Date().getFullYear()} Sonrisa Dental. Datos tratados conforme a la Ley 19.628.
        </p>
      </div>
    </footer>
  );
}