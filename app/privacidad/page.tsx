import type { Metadata } from "next";
import { Card, CardHeader } from "@/components/ui";
import {
  CLINIC_ADDRESS,
  CLINIC_PHONE,
  CONSENT_TEXT,
  PRIVACY_SUMMARY,
  SUPPORT_EMAIL,
} from "@/lib/clinic";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description:
    "Cómo tratamos tus datos personales para gestionar tus citas, conforme a la Ley 19.628.",
};

export default function PrivacidadPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold text-brand-navy">Aviso de privacidad</h1>
      <p className="mt-2 text-base text-neutral-700">
        {CONSENT_TEXT}
      </p>

      <div className="mt-8 space-y-6">
        {PRIVACY_SUMMARY.map((item) => (
          <Card key={item.title}>
            <CardHeader title={item.title} />
            <p className="p-5 pt-0 text-sm leading-relaxed text-neutral-700">{item.body}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader title="Tratamiento y основа legal" />
        <div className="space-y-3 p-5 pt-0 text-sm leading-relaxed text-neutral-700">
          <p>
            El responsable del tratamiento es {CLINIC_NAME}, con domicilio en {CLINIC_ADDRESS}.
            La base legal es tu consentimiento, que otorgas al marcar la casilla al reservar.
          </p>
          <p>
            Los datos se almacenan cifrados en tránsito (HTTPS). El acceso a la base está
            restringido al personal estrictamente necesario y cada acceso queda registrado en
            la agenda del profesional.
          </p>
          <p>
            No usamos tus datos con fines publicitarios, no los cedemos a terceros y no
            implementamos decisiones automatizadas que puedan producir efectos jurídicos sobre
            ti.
          </p>
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Contacto" />
        <div className="space-y-1 p-5 pt-0 text-sm text-neutral-700">
          <p>
            Para ejercer tus derechos de acceso, rectificación o eliminación escribe a{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-brand-navy">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
          <p>
            También puedes llamar al{" "}
            <a href={`tel:${CLINIC_PHONE.replace(/\s/g, "")}`} className="font-semibold text-brand-navy">
              {CLINIC_PHONE}
            </a>
            .
          </p>
        </div>
      </Card>

      <p className="mt-8 text-xs text-neutral-500">
        Última actualización: {new Date().getFullYear()}.
      </p>
    </div>
  );
}

const CLINIC_NAME = "Sonrisa Dental";
