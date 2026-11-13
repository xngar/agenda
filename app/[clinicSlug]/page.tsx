import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  Clock,
  MailCheck,
  MapPin,
  Phone,
} from "lucide-react";
import { OrganizationNotFoundError } from "@/lib/errors";
import { getCatalog, getPublicOrganization } from "@/lib/booking";
import { Card, buttonClasses } from "@/components/ui";
import { CLINIC_ADDRESS, CLINIC_PHONE } from "@/lib/clinic";
import { getDoctorSession } from "@/lib/auth";
import ManageAppointmentModal from "@/components/booking/manage-appointment-modal";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

export async function generateMetadata({ params }: { params: Promise<{ clinicSlug: string }> }) {
  const { clinicSlug } = await params;
  const org = await getPublicOrganization(clinicSlug).catch(() => null);
  return {
    title: { absolute: `${org?.name ?? "Clínica"} · Reserva tu hora` },
  };
}

async function loadHomeData(clinicSlug: string) {
  try {
    const [catalog, doctor] = await Promise.all([getCatalog(clinicSlug), getDoctorSession()]);
    return { catalog, doctor };
  } catch (error) {
    if (error instanceof OrganizationNotFoundError) notFound();
    throw error;
  }
}

export default async function HomePage({ params }: { params: Promise<{ clinicSlug: string }> }) {
  const { clinicSlug } = await params;
  const { catalog, doctor } = await loadHomeData(clinicSlug);
  const { settings } = catalog;
  const address = settings.address ?? CLINIC_ADDRESS;
  const phone = settings.phone ?? CLINIC_PHONE;
  const cancelLabel =
    settings.cancel_min_hours > 0
      ? `hasta ${settings.cancel_min_hours} h antes`
      : "hasta antes de la cita";

  const steps = [
    {
      n: "01",
      Icon: ClipboardList,
      t: "Elige qué necesitas",
      d: "Selecciona el tipo de consulta o atención.",
    },
    {
      n: "02",
      Icon: CalendarCheck,
      t: "Elige a quién y cuándo",
      d: "Escoge un profesional o pide la primera hora disponible.",
    },
    {
      n: "03",
      Icon: MailCheck,
      t: "Confirmación en tu correo",
      d: "Recibe el comprobante y el enlace para gestionar tu cita.",
    },
  ];

  const clinicFacts = [
    {
      k: "Horario",
      v: "Lunes a viernes 09:00 – 13:00 y 15:00 – 19:00 · Sábado 09:00 – 13:00",
      Icon: Clock,
      accent: "blue" as const,
    },
    {
      k: "Dirección",
      v: address,
      Icon: MapPin,
      accent: "purple" as const,
    },
    {
      k: "Teléfono",
      v: (
        <a
          href={`tel:${phone.replace(/\s/g, "")}`}
          className="font-semibold text-[var(--lp-blue)] transition-colors hover:text-[var(--lp-navy)] hover:underline"
        >
          {phone}
        </a>
      ),
      Icon: Phone,
      accent: "blue" as const,
    },
    {
      k: "Reservas y cambios",
      v: `Reserva con ${settings.min_notice_hours} h de anticipación · Cancelación ${cancelLabel}`,
      Icon: CalendarClock,
      accent: "purple" as const,
    },
  ];

  return (
    <>
      <section className="border-b border-[var(--lp-sky-200)]/70 bg-white">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
          <ScrollReveal yOffset={14}>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-[var(--lp-navy)] sm:text-4xl lg:text-5xl [text-wrap:balance]">
              {settings.name}
            </h1>
            <p className="mt-3 text-lg font-semibold text-action-primary sm:text-xl">
              Agenda tu atención online en menos de dos minutos.
            </p>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-neutral-600">
              Elige el servicio, el profesional y el horario que te acomode en tiempo real, sin
              llamadas ni contraseñas.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={`/${clinicSlug}/reservar`}
                className={buttonClasses("primary", "lg", "shadow-md hover:scale-[1.02]")}
              >
                <span>Reservar ahora</span>
                <ArrowRight className="h-4 w-4 btn-icon-right" aria-hidden="true" />
              </Link>
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className={buttonClasses("secondary", "lg", "hover:scale-[1.02]")}
              >
                <Phone className="h-4 w-4 btn-icon-wiggle" aria-hidden="true" />
                <span>Llamar {phone}</span>
              </a>
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--lp-sky-200)]/90 bg-white p-3.5 shadow-sm transition-all duration-element hover:border-[var(--lp-blue)]/40 hover:shadow-md">
              <ManageAppointmentModal clinicSlug={clinicSlug} clinicName={settings.name} variant="link">
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--lp-sky-100)] text-[var(--lp-navy)]"
                    >
                      <Calendar className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-xs font-medium text-neutral-500">
                        ¿Ya tienes una cita agendada?
                      </span>
                      <span className="block text-sm font-semibold text-action-primary">
                        Gestionar, reprogramar o cancelar
                      </span>
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-action-primary btn-icon-right" aria-hidden="true" />
                </span>
              </ManageAppointmentModal>
            </div>
          </ScrollReveal>

          <ScrollReveal yOffset={16} delay={0.08}>
            <Card className="rounded-3xl border-[var(--lp-sky-200)]/80 bg-white p-6 shadow-xl shadow-sky-900/5 sm:p-7">
              <h2 className="text-lg font-bold text-[var(--lp-navy)]">Cómo funciona</h2>
              <ol className="relative mt-5 space-y-5">
                {steps.map(({ n, Icon, t, d }, idx) => (
                  <li key={n} className="relative flex gap-3.5">
                    {idx < steps.length - 1 ? (
                      <span
                        aria-hidden="true"
                        className="absolute top-9 left-4.5 h-[calc(100%-0.5rem)] w-px bg-[var(--lp-sky-200)]"
                      />
                    ) : null}
                    <span
                      aria-hidden="true"
                      className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--lp-navy)] font-mono text-xs font-bold text-white shadow-xs"
                    >
                      {n}
                    </span>
                    <span className="min-w-0 pt-0.5">
                      <span className="flex items-center gap-1.5 text-sm font-bold text-[var(--lp-navy)]">
                        <Icon className="h-4 w-4 shrink-0 text-action-primary" aria-hidden="true" />
                        <span>{t}</span>
                      </span>
                      <span className="mt-0.5 block text-sm leading-relaxed text-neutral-600">{d}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      <section aria-labelledby="datos" className="bg-slate-50/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <ScrollReveal yOffset={12}>
            <h2 id="datos" className="text-2xl font-bold text-[var(--lp-navy)] sm:text-3xl">
              Datos de la clínica
            </h2>
          </ScrollReveal>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {clinicFacts.map(({ k, v, Icon, accent }) => (
              <div
                key={k}
                className="card-hover-lift rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    accent === "blue"
                      ? "bg-[var(--lp-sky-100)] text-[var(--lp-navy)]"
                      : "bg-action-primary/10 text-action-primary"
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <dt className="mt-3.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {k}
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-neutral-800">{v}</dd>
              </div>
            ))}
          </dl>

          {doctor ? (
            <Card className="mt-6 flex flex-col items-start justify-between gap-4 border-[var(--lp-sky-200)]/80 bg-white p-5 sm:flex-row sm:items-center">
              <p className="text-sm text-neutral-700">
                Hola, <strong className="text-[var(--lp-navy)]">{doctor.full_name}</strong>. Tienes
                una sesión abierta en el panel.
              </p>
              <Link href="/dashboard" className={buttonClasses("secondary", "sm")}>
                <span>Ir a mi agenda</span>
                <ArrowRight className="h-4 w-4 btn-icon-right" aria-hidden="true" />
              </Link>
            </Card>
          ) : null}
        </div>
      </section>
    </>
  );
}
