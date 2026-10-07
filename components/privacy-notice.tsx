import { Card, CardHeader } from "@/components/ui";
import { CONSENT_TEXT, PRIVACY_SUMMARY, type ClinicBrand } from "@/lib/clinic";

/**
 * Aviso de privacidad reutilizable. El texto de consentimiento y los datos
 * de contacto salen de la organización; quedan como respaldo las constantes
 * de `lib/clinic` para las rutas sin slug.
 */
export default function PrivacyNotice({
  brand,
  consentText,
}: {
  brand: ClinicBrand;
  consentText?: string | null;
}) {
  const address = brand.address ?? "";
  const phone = brand.phone ?? "";
  const supportEmail = brand.supportEmail ?? "";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold text-brand-navy">Aviso de privacidad</h1>
      <p className="mt-2 text-base text-neutral-700">{consentText ?? CONSENT_TEXT}</p>

      <div className="mt-8 space-y-6">
        {PRIVACY_SUMMARY.map((item) => (
          <Card key={item.title}>
            <CardHeader title={item.title} />
            <p className="p-5 pt-0 text-sm leading-relaxed text-neutral-700">{item.body}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader title="Tratamiento y base legal" />
        <div className="space-y-3 p-5 pt-0 text-sm leading-relaxed text-neutral-700">
          <p>
            El responsable del tratamiento es {brand.name}
            {address ? `, con domicilio en ${address}` : ""}. La base legal es tu consentimiento,
            que otorgas al marcar la casilla al reservar.
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

      {supportEmail || phone ? (
        <Card className="mt-6">
          <CardHeader title="Contacto" />
          <div className="space-y-1 p-5 pt-0 text-sm text-neutral-700">
            {supportEmail ? (
              <p>
                Para ejercer tus derechos de acceso, rectificación o eliminación escribe a{" "}
                <a href={`mailto:${supportEmail}`} className="font-semibold text-brand-navy">
                  {supportEmail}
                </a>
                .
              </p>
            ) : null}
            {phone ? (
              <p>
                También puedes llamar al{" "}
                <a href={`tel:${phone.replace(/\s/g, "")}`} className="font-semibold text-brand-navy">
                  {phone}
                </a>
                .
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}

      <p className="mt-8 text-xs text-neutral-500">
        Última actualización: {new Date().getFullYear()}.
      </p>
    </div>
  );
}