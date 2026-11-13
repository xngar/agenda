import type { Metadata } from "next";
import LegalLayout, { type TocItem } from "@/components/legal/legal-layout";
import { siteConfig } from "@/lib/site-config";
import {
  AlertTriangle,
  Stethoscope,
  ShieldCheck,
  Scale,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Términos y Condiciones de Uso",
  description:
    "Términos y condiciones contractuales aplicables al uso de la plataforma de agendamiento online, software médico y ficha clínica electrónica en Chile.",
};

const toc: TocItem[] = [
  { id: "objeto", title: "1. Objeto y Aceptación de los Términos" },
  { id: "descripcion", title: "2. Descripción de la Plataforma SaaS" },
  { id: "exoneracion-medica", title: "3. Naturaleza Tecnológica y Límite Médico" },
  { id: "profesionales", title: "4. Reglas para Clínicas y Profesionales" },
  { id: "pacientes", title: "5. Reglas para Pacientes y Reservas" },
  { id: "cancelaciones", title: "6. Modificaciones, Cancelaciones y No-Show" },
  { id: "seguridad-cuentas", title: "7. Cuentas, Credenciales y Seguridad" },
  { id: "propiedad-intelectual", title: "8. Propiedad Intelectual y Datos" },
  { id: "precios-pagos", title: "9. Precios, Planes y Facturación" },
  { id: "disponibilidad", title: "10. Nivel de Servicio (SLA) y Soporte" },
  { id: "terminacion", title: "11. Suspensión y Rescisión del Servicio" },
  { id: "jurisdiccion", title: "12. Ley Aplicable y Jurisdicción" },
];

export default function TerminosPage() {
  const brandName = siteConfig.name !== "[Nombre]" ? siteConfig.name : "Agenda Online / Gethour";
  const contactEmail = siteConfig.email !== "[correo]" ? siteConfig.email : "contacto@gethour.cl";

  return (
    <LegalLayout
      title="Términos y Condiciones de Uso"
      subtitle={`Reglas, derechos y responsabilidades que rigen el acceso y utilización de los servicios de ${brandName} en el territorio de la República de Chile.`}
      badge="Condiciones Contractuales del Servicio"
      lastUpdated="Noviembre 2026"
      toc={toc}
    >
      <div className="space-y-12">
        {/* Banner de exención médica y aviso esencial */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h2 className="text-base font-bold text-amber-900">
                Aviso Esencial: Proveedor de Software Tecnológico
              </h2>
              <p className="text-sm leading-relaxed text-amber-800">
                {brandName} es un proveedor exclusivo de infraestructura tecnológica y software como servicio
                (SaaS). <strong>No somos una clínica ni prestadores de salud directos.</strong> Toda relación
                médico-paciente, diagnóstico, receta, consentimiento o procedimiento odontológico o médico
                es responsabilidad estricta y exclusiva del profesional o clínica de salud tratante.
              </p>
            </div>
          </div>
        </div>

        {/* Sección 1 */}
        <section id="objeto" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            1. Objeto y Aceptación de los Términos
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-neutral-700">
            El presente instrumento contractual establece los Términos y Condiciones Generales que
            regulan el acceso, navegación y uso del software web y servicios provistos por{" "}
            <strong>{brandName}</strong> (en adelante, la &ldquo;Plataforma&rdquo;).
          </p>
          <p className="text-sm sm:text-base leading-relaxed text-neutral-700">
            Al acceder, reservar una cita a través del sitio web o iniciar sesión en el panel profesional,
            el usuario declara haber leído, comprendido íntegramente y aceptado vincularse conforme a estos
            términos. Si no está de acuerdo con alguna disposición, debe abstenerse de utilizar el servicio.
          </p>
        </section>

        {/* Sección 2 */}
        <section id="descripcion" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            2. Descripción de la Plataforma SaaS
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-neutral-700">
            {brandName} pone a disposición una solución en la nube orientada a centros de salud, clínicas
            odontológicas y facultativos independientes que incluye:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-neutral-700">
            <li>
              <strong>Módulo público de reservas:</strong> Asistente interactivo para que los pacientes
              reserven horas en tiempo real con confirmación inmediata y gestión mediante token de seguridad.
            </li>
            <li>
              <strong>Panel de gestión de agendas:</strong> Calendario profesional (vistas mensual, semanal,
              diaria), bloqueo de horarios, gestión de feriados y sobrecupos con sincronización en tiempo real.
            </li>
            <li>
              <strong>Ficha Médica y Odontológica Electrónica:</strong> Registro clínico asistencial estructurado
              conforme a las directrices de la Ley N° 20.584 (anamnesis, odontograma, periodontograma,
              recetas, consentimiento informado y auditoría inmutable de accesos).
            </li>
            <li>
              <strong>Comunicaciones automatizadas:</strong> Notificaciones por correo electrónico y avisos
              de confirmación y recordatorio.
            </li>
          </ul>
        </section>

        {/* Sección 3 */}
        <section id="exoneracion-medica" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            3. Naturaleza Tecnológica y Límite Médico (Indemnidad)
          </h2>
          <div className="space-y-3 text-sm sm:text-base text-neutral-700 leading-relaxed">
            <p>
              Queda expresamente establecido que:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="border border-neutral-200 rounded-lg p-4 bg-white">
                <div className="flex items-center gap-2 font-bold text-neutral-900 mb-1">
                  <Stethoscope className="h-4 w-4 text-blue-600" />
                  <span>Sin Consejo Médico</span>
                </div>
                <p className="text-neutral-600">
                  La plataforma no evalúa síntomas ni prescribe tratamientos. No es un dispositivo
                  médico ni un servicio de telemedicina de urgencia. Ante una emergencia vital, el
                  usuario debe acudir de inmediato a un centro asistencial o llamar al 131 (SAMU).
                </p>
              </div>
              <div className="border border-neutral-200 rounded-lg p-4 bg-white">
                <div className="flex items-center gap-2 font-bold text-neutral-900 mb-1">
                  <Scale className="h-4 w-4 text-blue-600" />
                  <span>Autonomía Profesional</span>
                </div>
                <p className="text-neutral-600">
                  El acto médico y odontológico es de entera y exclusiva responsabilidad del profesional
                  habilitado por la Superintendencia de Salud que realiza la atención.
                </p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-neutral-600 italic">
              {brandName} no asume ninguna responsabilidad civil, penal ni administrativa derivada de
              negligencia médica, errores en diagnósticos, prescripciones o retrasos atribuibles al
              equipo clínico tratante.
            </p>
          </div>
        </section>

        {/* Sección 4 */}
        <section id="profesionales" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            4. Reglas para Clínicas y Profesionales de la Salud
          </h2>
          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
            Las organizaciones y profesionales que contratan u operan la plataforma se comprometen a:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-neutral-700">
            <li>
              Contar con las autorizaciones sanitarias y habilitaciones profesionales legales vigentes
              en Chile (inscripción en el Registro Nacional de Prestadores Individuales de la Superintendencia de Salud).
            </li>
            <li>
              Custodiar diligentemente sus credenciales de acceso (RUT y clave) y no transferirlas a terceros.
            </li>
            <li>
              Garantizar que todo el personal clínico respete el secreto profesional y las normas de confidencialidad
              fijadas por la Ley N° 20.584 y el Código Sanitario.
            </li>
            <li>
              Mantener actualizados sus horarios de disponibilidad, aranceles informados y condiciones de atención.
            </li>
          </ul>
        </section>

        {/* Sección 5 */}
        <section id="pacientes" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            5. Reglas para Pacientes y Reservas Públicas
          </h2>
          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
            Al realizar una reserva en línea a través del sistema, el paciente se obliga a:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-neutral-700">
            <li>
              Ingresar datos fidedignos, exactos y vigentes (nombre completo, RUT o identificador legal,
              teléfono móvil de contacto y correo electrónico operativo).
            </li>
            <li>
              Presentarse en el establecimiento con la antelación solicitada por la clínica para la adecuada recepción administrativa.
            </li>
            <li>
              No efectuar reservas maliciosas, ficticias o múltiples deliberadas con el propósito de bloquear horarios disponibles.
            </li>
          </ul>
        </section>

        {/* Sección 6 */}
        <section id="cancelaciones" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            6. Modificaciones, Cancelaciones y Política de No-Show
          </h2>
          <div className="space-y-3 text-sm sm:text-base text-neutral-700 leading-relaxed">
            <p>
              Cada cita reservada cuenta con un enlace de autogestión protegido mediante token de seguridad
              que permite cancelar o solicitar reprogramación:
            </p>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-2 text-xs sm:text-sm">
              <div className="flex items-center gap-2 font-semibold text-neutral-900">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Plazos de Cancelación Oportuna</span>
              </div>
              <p className="text-neutral-600">
                Se recomienda cancelar con al menos <strong>24 horas de anticipación</strong> para liberar el box
                de atención y permitir que otro paciente que requiera la hora pueda tomarla.
              </p>
              <p className="text-neutral-600">
                Las políticas sobre cobro de reservas o penalidades por inasistencia no informada (&ldquo;no-show&rdquo;)
                son definidas directamente por cada clínica y rigen bajo las condiciones que dicha institución informe previamente.
              </p>
            </div>
          </div>
        </section>

        {/* Sección 7 */}
        <section id="seguridad-cuentas" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            7. Cuentas, Credenciales y Seguridad
          </h2>
          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
            El acceso al panel profesional requiere autenticación mediante RUT y clave robusta.
            El usuario es el único responsable por cualquier actividad ejecutada bajo su cuenta.
            En caso de sospecha de compromiso de contraseña, debe proceder al cambio inmediato y
            notificar al administrador de su clínica o al equipo de soporte de {brandName}.
          </p>
        </section>

        {/* Sección 8 */}
        <section id="propiedad-intelectual" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            8. Propiedad Intelectual y Titularidad de los Datos
          </h2>
          <div className="space-y-3 text-sm sm:text-base text-neutral-700 leading-relaxed">
            <p>
              <strong>De la Plataforma:</strong> El software, arquitectura, código fuente, algoritmos, interfaces,
              marcas, dominios y diseños son propiedad exclusiva de {brandName} y se encuentran protegidos por la Ley
              N° 17.336 sobre Propiedad Intelectual. Se otorga una licencia de uso limitada, no exclusiva e intransferible.
            </p>
            <p>
              <strong>De los Datos Clínicos:</strong> La información asistencial ingresada en las fichas clínicas
              pertenece al paciente y a la clínica en los términos de la Ley N° 20.584. {brandName} no reivindica
              ninguna titularidad propietaria sobre la información de salud registrada por los usuarios.
            </p>
          </div>
        </section>

        {/* Sección 9 */}
        <section id="precios-pagos" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            9. Precios, Planes y Facturación
          </h2>
          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
            Para las clínicas contratantes, el servicio se presta bajo modalidad de suscripción periódica
            (mensual o anual) según el plan contratado. Los valores vigentes, periodicidad de pago y emisión
            de boletas o facturas exentas/afectas según normativa del Servicio de Impuestos Internos (SII)
            se formalizan en la propuesta comercial respectiva.
          </p>
        </section>

        {/* Sección 10 */}
        <section id="disponibilidad" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            10. Nivel de Servicio (SLA) y Soporte
          </h2>
          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
            Nos esforzamos por mantener una disponibilidad de la plataforma superior al <strong>99,5%</strong>.
            Eventuales ventanas de mantenimiento preventivo serán programadas prioritariamente en horarios de baja
            afluencia (noches o fines de semana) y notificadas con antelación razonable.
          </p>
        </section>

        {/* Sección 11 */}
        <section id="terminacion" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            11. Suspensión y Rescisión del Servicio
          </h2>
          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
            {brandName} se reserva el derecho de suspender temporalmente o cancelar de manera definitiva
            el acceso a cuentas que incurran en:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-neutral-700">
            <li>Intentos de vulnerar la seguridad, realizar ingeniería inversa o alterar las políticas de Row Level Security (RLS).</li>
            <li>Inactividad prolongada o incumplimiento manifiesto en el pago de suscripciones acordadas.</li>
            <li>Uso ilegítimo que atente contra la normativa chilena o los derechos de terceros.</li>
          </ul>
        </section>

        {/* Sección 12 */}
        <section id="jurisdiccion" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            12. Ley Aplicable y Jurisdicción
          </h2>
          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
            Los presentes Términos se rigen e interpretan conforme a las leyes de la República de Chile.
            Cualquier controversia, duda o conflicto que surja en relación con su existencia, validez,
            interpretación o cumplimiento será sometida al conocimiento y competencia de los Tribunales Ordinarios
            de Justicia de la ciudad de Santiago de Chile.
          </p>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs sm:text-sm text-neutral-700">
            <p className="font-semibold text-neutral-900">Mesa de Ayuda y Contacto Legal:</p>
            <p className="mt-1">
              Para consultas contractuales o dudas sobre estos términos, escríbenos a:{" "}
              <a href={`mailto:${contactEmail}`} className="font-semibold text-blue-700 underline">
                {contactEmail}
              </a>
            </p>
          </div>
        </section>
      </div>
    </LegalLayout>
  );
}
