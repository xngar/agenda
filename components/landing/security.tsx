import { ShieldCheck, Users, Database, Download } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export default function Security() {
  return (
    <section id="seguridad" className="bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--lp-navy)] sm:text-4xl">
            Los datos de tus pacientes, protegidos
          </h2>
          <p className="mt-4 text-lg text-[var(--lp-navy)]/90">
            Sabemos que la información de salud es sensible. Por eso {siteConfig.name} está diseñada pensando en la normativa chilena de fichas clínicas y protección de datos.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { Icon: Users, text: "Acceso por roles" },
            { Icon: ShieldCheck, text: "Registro de quién consulta y modifica cada ficha" },
            { Icon: Database, text: "Datos cifrados y respaldos periódicos" },
            { Icon: Download, text: "Exportación de la información de tu clínica" },
          ].map(({ Icon, text }) => (
            <article
              key={text}
              className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-[var(--lp-sky-200)]"
            >
              <Icon className="h-8 w-8 text-[var(--lp-blue)]" />
              <p className="mt-3 text-sm font-medium text-[var(--lp-navy)]">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
