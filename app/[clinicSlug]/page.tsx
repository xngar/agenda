import Link from "next/link";
import { getCatalog } from "@/lib/booking";
import { Card, buttonClasses } from "@/components/ui";
import { formatDuration } from "@/lib/dates";
import { CLINIC_ADDRESS, CLINIC_PHONE } from "@/lib/clinic";
import { getDoctorSession } from "@/lib/auth";

export const metadata = {
  title: "Reserva tu hora en lÃ­nea",
};

export default async function HomePage({ params }: { params: Promise<{ clinicSlug: string }> }) {
  const { clinicSlug } = await params; const [catalog, doctor] = await Promise.all([getCatalog(clinicSlug), getDoctorSession()]);
  const { settings, services, doctors } = catalog;

  return (
    <>
      {/* Hero */}
      <section className="border-b border-neutral-200 bg-gradient-to-b from-brand-sky-50 to-white">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-navy shadow-card">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand-sky" />
              Lunes a sÃ¡bado Â· ConfirmaciÃ³n inmediata
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-brand-navy sm:text-4xl lg:text-[2.75rem]">
              Tu hora con el dentista, en dos minutos
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-700">
              Elige el servicio, el profesional y el horario que te acomode. Te enviamos la
              confirmaciÃ³n al correo y puedes cambiar o cancelar tu cita cuando quieras.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/reservar" className={buttonClasses("primary", "lg")}>
                Reservar ahora
              </Link>
              <a href={`tel:${CLINIC_PHONE.replace(/\s/g, "")}`} className={buttonClasses("secondary", "lg")}>
                Llamar {CLINIC_PHONE}
              </a>
            </div>
            <p className="mt-5 text-xs text-neutral-600">
              Sin registro ni contraseÃ±a. Necesitamos sÃ³lo tu nombre, RUT, telÃ©fono y correo.
            </p>
          </div>

          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-semibold text-brand-navy">CÃ³mo funciona</h2>
            <ol className="mt-4 space-y-4">
              {[
                { n: 1, t: "Elige quÃ© necesitas", d: "Control, limpieza o urgencia dental." },
                { n: 2, t: "Elige a quiÃ©n y cuÃ¡ndo", d: "Puedes dejar que elijamos el profesional libre." },
                { n: 3, t: "Deja tus datos", d: "Te escribimos para confirmar y adjuntamos la cita al calendario." },
              ].map((step) => (
                <li key={step.n} className="flex gap-3.5">
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-navy text-sm font-bold text-white"
                  >
                    {step.n}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-neutral-800">{step.t}</span>
                    <span className="block text-sm text-neutral-600">{step.d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </section>

      {/* Servicios */}
      <section aria-labelledby="servicios" className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <h2 id="servicios" className="text-2xl font-bold text-brand-navy">
          Servicios
        </h2>
        <p className="mt-1.5 text-sm text-neutral-600">
          DuraciÃ³n aproximada de cada atenciÃ³n. Si tu caso es distinto, conversamos al llegar.
        </p>

        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {services.map((service) => (
            <Card as="li" key={service.id} className="flex flex-col p-5">
              <h3 className="text-base font-semibold text-brand-navy">{service.name}</h3>
              <p className="mt-1 text-sm text-neutral-600">
                DuraciÃ³n aproximada: {formatDuration(service.duration_min)}
              </p>
              <div className="mt-4 pt-1">
                <Link
                  href={`/reservar?servicio=${service.id}`}
                  className={buttonClasses("secondary", "sm", "w-full")}
                >
                  Reservar {service.name.toLowerCase()}
                </Link>
              </div>
            </Card>
          ))}
        </ul>
      </section>

      {/* Equipo + datos */}
      <section aria-labelledby="equipo" className="border-y border-neutral-200 bg-white">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2 id="equipo" className="text-2xl font-bold text-brand-navy">
              Nuestro equipo
            </h2>
            <ul className="mt-5 space-y-3">
              {doctors.map((doc) => (
                <li key={doc.id}>
                  <Card className="flex items-center gap-4 px-4 py-3.5">
                    <span
                      aria-hidden="true"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-sky-100 text-sm font-bold text-brand-navy"
                    >
                      {initials(doc.full_name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-neutral-800">{doc.full_name}</span>
                      {doc.specialty ? (
                        <span className="block text-sm text-neutral-600">{doc.specialty}</span>
                      ) : null}
                    </span>
                  </Card>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-brand-navy">Datos de la clÃ­nica</h2>
            <dl className="mt-5 divide-y divide-neutral-200 overflow-hidden rounded-card border border-neutral-200 bg-white">
              {[
                { k: "Horario", v: "Lunes a viernes 09:00 â€“ 13:00 y 15:00 â€“ 19:00 Â· SÃ¡bado 09:00 â€“ 13:00" },
                { k: "DirecciÃ³n", v: CLINIC_ADDRESS },
                { k: "TelÃ©fono", v: CLINIC_PHONE },
                { k: "AnticipaciÃ³n mÃ­nima", v: `${settings.min_notice_hours} horas` },
                { k: "CancelaciÃ³n", v: `hasta ${settings.cancel_min_hours} horas antes` },
              ].map((row) => (
                <div key={row.k} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:gap-4">
                  <dt className="text-sm font-medium text-neutral-600 sm:w-44 sm:shrink-0">{row.k}</dt>
                  <dd className="text-sm text-neutral-800">{row.v}</dd>
                </div>
              ))}
            </dl>

            {doctor ? (
              <Card className="mt-5 p-4">
                <p className="text-sm text-neutral-700">
                  Hola, <strong className="text-brand-navy">{doctor.full_name}</strong>. Tienes una
                  sesiÃ³n abierta en el panel.
                </p>
                <Link href="/dashboard" className={buttonClasses("ghost", "sm", "mt-3")}>
                  Ir a mi agenda
                </Link>
              </Card>
            ) : null}
          </div>
        </div>
      </section>

      {/* Cerrada el domingo */}
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <p className="rounded-card bg-brand-navy-50 px-4 py-3 text-sm text-brand-navy-900">
          Atendemos de lunes a sÃ¡bado. El sÃ¡bado sÃ³lo en la maÃ±ana y el domingo cerrado. Los
          feriados y los dÃ­as bloqueados por los profesionales no se pueden reservar.
        </p>
      </section>
    </>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}
