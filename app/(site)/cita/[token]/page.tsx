import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAppointmentByToken, getCatalog, toPatientView } from "@/lib/booking";
import { isManageTokenShape } from "@/lib/token";
import ManageAppointment from "./manage-appointment";

export const metadata: Metadata = {
  title: "Tu cita",
  // Un enlace con token no debe quedar indexado ni compartido.
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function CitaPage({ params }: Props) {
  const { token } = await params;

  // Forma inválida: 404 de inmediato, sin tocar la base.
  if (!isManageTokenShape(token)) notFound();

  const found = await getAppointmentByToken(token);
  if (!found) notFound();

  const [appointment, catalog] = await Promise.all([
    toPatientView(found.row),
    // El calendario de reprogramación necesita feriados y límites, igual
    // que en /reservar.
    getCatalog("sonrisa-dental"),
  ]);

  // Ya pasó o quedó cancelada: se muestra el estado, no un 404, porque el
  // paciente necesita entender qué pasó con su cita.
  return (
    <ManageAppointment
      token={token}
      appointment={appointment}
      canModify={appointment.canModify}
      holidays={catalog.holidays}
      minNoticeHours={catalog.settings.min_notice_hours}
      maxDaysAhead={catalog.settings.max_days_ahead}
    />
  );
}
