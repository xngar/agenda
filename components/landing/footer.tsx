import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--lp-sky-200)] bg-[var(--lp-navy)] text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="text-lg font-bold">{siteConfig.name}</div>
          <p className="mt-2 text-sm text-white/80">
            Agenda, fichas clínicas y pacientes en un solo lugar.
          </p>
        </div>
        <div>
          <div className="text-sm font-semibold">Enlaces</div>
          <ul className="mt-2 space-y-1.5 text-sm text-white/80">
            <li>
              <Link href="#funciones">Funciones</Link>
            </li>
            <li>
              <Link href="#como-funciona">Cómo funciona</Link>
            </li>
            <li>
              <Link href="#seguridad">Seguridad</Link>
            </li>
            <li>
              <Link href="#planes">Planes</Link>
            </li>
            <li>
              <Link href="#preguntas">Preguntas</Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold">Contacto</div>
          <ul className="mt-2 space-y-1.5 text-sm text-white/80">
            <li>
              <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
            </li>
            <li>
              <a href={`https://wa.me/${siteConfig.whatsapp.replace(/\D/g, "")}`}>WhatsApp</a>
            </li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold">Legal</div>
          <ul className="mt-2 space-y-1.5 text-sm text-white/80">
            <li>
              <Link href="/terminos">Términos</Link>
            </li>
            <li>
              <Link href="/politica-privacidad">Política de privacidad</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 sm:px-6 lg:px-8">
        <p className="text-xs text-white/60">
          © {new Date().getFullYear()} {siteConfig.name}. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
