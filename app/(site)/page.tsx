import Link from "next/link";
import { getCatalog, getPublicOrganization } from "@/lib/booking";
import { Card, buttonClasses } from "@/components/ui";
import { CLINIC_ADDRESS, CLINIC_PHONE } from "@/lib/clinic";
import { getDoctorSession } from "@/lib/auth";

export async function generateMetadata() {
  const org = await getPublicOrganization("sonrisa-dental").catch(() => null);
  return {
    title: { absolute: `${org?.name ?? "Clínica odontológica"} · Reserva tu hora` },
  };
}

export default async function HomePage() {
  const [catalog, doctor] = await Promise.all([getCatalog("sonrisa-dental"), getDoctorSession()]);
  const { settings } = catalog;
  const address = settings.address ?? CLINIC_ADDRESS;
  const phone = settings.phone ?? CLINIC_PHONE;

  return (
    <>
      {/* Hero */}
      <section className="border-b border-neutral-200 bg-gradient-to-b from-brand-sky-50 to-white">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-navy shadow-card">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand-sky" />
              Lunes a sábado · Confirmación inmediata
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-brand-navy sm:text-4xl lg:text-[2.75rem]">
              {settings.name}
            </h1>
            <p className="mt-3 text-lg font-semibold text-neutral-800 sm:text-xl">
              Tu hora con el dentista, en dos minutos.
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-700">
              Elige el servicio, el profesional y el horario que te acomode. Te enviamos la
              confirmación al correo y puedes cambiar o cancelar tu cita cuando quieras.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/reservar" className={buttonClasses("primary", "lg")}>
                Reservar ahora
              </Link>
              <a href={`tel:${phone.replace(/\s/g, "")}`} className={buttonClasses("secondary", "lg")}>
                Llamar {phone}
              </a>
            </div>
            <p className="mt-5 text-xs text-neutral-600">
              Sin registro ni contraseña. Necesitamos sólo tu nombre, RUT, teléfono y correo.
            </p>
          </div>

          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-semibold text-brand-navy">Cómo funciona</h2>
            <ol className="mt-4 space-y-4">
              {[
                { n: 1, t: "Elige qué necesitas", d: "Control, limpieza o urgencia dental." },
                { n: 2, t: "Elige a quién y cuándo", d: "Puedes dejar que elijamos el profesional libre." },
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

      {/* Datos de la clínica */}
      <section aria-labelledby="datos" className="border-y border-neutral-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <div className="max-w-3xl">
            <h2 id="datos" className="text-2xl font-bold text-brand-navy">
              Datos de la clínica
            </h2>
            <dl className="mt-5 divide-y divide-neutral-200 overflow-hidden rounded-card border border-neutral-200 bg-white">
              {[
                { k: "Horario", v: "Lunes a viernes 09:00 – 13:00 y 15:00 – 19:00 · Sábado 09:00 – 13:00" },
                { k: "Dirección", v: address },
                { k: "Teléfono", v: phone },
                { k: "Anticipación mínima", v: `${settings.min_notice_hours} horas` },
                { k: "Cancelación", v: `hasta ${settings.cancel_min_hours} horas antes` },
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
                  sesión abierta en el panel.
                </p>
                <Link href="/dashboard" className={buttonClasses("ghost", "sm", "mt-3")}>
                  Ir a mi agenda
                </Link>
              </Card>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
