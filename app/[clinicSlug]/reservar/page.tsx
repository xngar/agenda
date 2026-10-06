import type { Metadata } from "next";
import { getCatalog } from "@/lib/booking";
import { ErrorNotice } from "@/components/ui";
import BookingWizard from "./booking-wizard";

export const metadata: Metadata = {
  title: "Reservar hora",
  description:
    "Elige servicio, profesional y hora para tu atenciÃ³n odontolÃ³gica. ConfirmaciÃ³n inmediata por correo.",
  // La disponibilidad cambia todo el tiempo; no tiene sentido cachearla.
  robots: { index: true, follow: true },
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ servicio?: string }>;
};

export default async function ReservarPage({ searchParams }: Props) {
  const { servicio } = await searchParams;

  let catalog;
  try {
    catalog = await getCatalog("sonrisa-dental");
  } catch {
    // No filtramos el motivo: al paciente no le sirve saber si fallÃ³ la
    // base o la red, y no queremos exponer internals en pantalla.
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-bold text-brand-navy">Reservar hora</h1>
        <div className="mt-5">
          <ErrorNotice message="No pudimos cargar la agenda en este momento. Intenta en unos minutos o llÃ¡manos." />
        </div>
      </div>
    );
  }

  // Un ?servicio=unknown no debe romper nada: el wizard simplemente no
  // preselecciona y el paciente elige.
  const initialServiceId = catalog.services.some((service) => service.id === servicio)
    ? servicio
    : undefined;

  return (
    <BookingWizard
      services={catalog.services}
      doctors={catalog.doctors}
      holidays={catalog.holidays}
      maxDaysAhead={catalog.settings.max_days_ahead}
      minNoticeHours={catalog.settings.min_notice_hours}
      cancelMinHours={catalog.settings.cancel_min_hours}
      clinicName={catalog.settings.name}
      timezone={catalog.settings.timezone}
      initialServiceId={initialServiceId}
    />
  );
}
