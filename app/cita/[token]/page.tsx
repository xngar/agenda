import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAppointmentByToken, getCatalog, toPatientView } from "@/lib/booking";
import { isManageTokenShape } from "@/lib/token";
import type { ClinicBrand } from "@/lib/clinic";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
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

  // El token identifica la cita, y la cita conoce su organización: de ahí
  // sale la marca de la página. Antes esta ruta colgaba de `(site)` y
  // mostraba siempre la clínica por defecto, así que una cita de otra
  // organización aparecía con dirección, teléfono y enlaces ajenos.
  const appointment = await toPatientView(found.row);
  const catalog = await getCatalog(appointment.clinicSlug || "sonrisa-dental");

  const brand: ClinicBrand = {
    name: appointment.clinicName,
    slug: appointment.clinicSlug || undefined,
    address: appointment.clinicAddress,
    phone: appointment.clinicPhone,
    supportEmail: appointment.supportEmail,
  };

  // Ya pasó o quedó cancelada: se muestra el estado, no un 404, porque el
  // paciente necesita entender qué pasó con su cita.
  return (
    <>
      <SiteHeader brand={brand} />
      <div className="flex-1">
        <ManageAppointment
          token={token}
          appointment={appointment}
          canModify={appointment.canModify}
          holidays={catalog.holidays}
          minNoticeHours={catalog.settings.min_notice_hours}
          maxDaysAhead={catalog.settings.max_days_ahead}
        />
      </div>
      <SiteFooter brand={brand} />
    </>
  );
}
