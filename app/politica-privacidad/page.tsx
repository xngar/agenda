import type { Metadata } from "next";
import LegalLayout, { type TocItem } from "@/components/legal/legal-layout";
import { siteConfig } from "@/lib/site-config";
import {
  ShieldCheck,
  Lock,
  FileCheck2,
  AlertCircle,
  KeyRound,
  Database,
  UserCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidad y Protección de Datos",
  description:
    "Conoce cómo protegemos tus datos personales y sensibles de salud en conformidad con la Ley N° 19.628 y la Ley N° 20.584 en Chile.",
};

const toc: TocItem[] = [
  { id: "introduccion", title: "1. Introducción y Alcance" },
  { id: "marco-legal", title: "2. Marco Legal Aplicable" },
  { id: "roles", title: "3. Responsable y Encargado del Tratamiento" },
  { id: "datos-recolectados", title: "4. Datos que Recolectamos" },
  { id: "finalidades", title: "5. Finalidades del Tratamiento" },
  { id: "datos-salud", title: "6. Datos Sensibles y Ficha Clínica" },
  { id: "seguridad", title: "7. Seguridad y Cifrado de la Información" },
  { id: "retencion", title: "8. Plazos de Conservación" },
  { id: "derechos-arco", title: "9. Derechos ARCO y Procedimiento" },
  { id: "destinatarios", title: "10. Destinatarios y Proveedores" },
  { id: "menores", title: "11. Tratamiento de Datos de Menores" },
  { id: "contacto", title: "12. Actualizaciones y Contacto" },
];

export default function PoliticaPrivacidadPage() {
  const brandName = siteConfig.name !== "[Nombre]" ? siteConfig.name : "Agenda Online / Gethour";
  const contactEmail = siteConfig.email !== "[correo]" ? siteConfig.email : "privacidad@gethour.cl";

  return (
    <LegalLayout
      title="Política de Privacidad y Protección de Datos"
      subtitle={`En ${brandName} la confidencialidad médica, la seguridad de la información y la privacidad de los pacientes y profesionales de la salud son nuestra máxima prioridad.`}
      badge="Cumplimiento Ley 19.628 & Ley 20.584"
      lastUpdated="Noviembre 2026"
      toc={toc}
    >
      <div className="space-y-12">
        {/* Resumen ejecutivo */}
        <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 text-blue-700 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h2 className="text-base font-bold text-[var(--lp-navy)]">
                Compromiso de Privacidad y Confidencialidad en Salud
              </h2>
              <p className="text-sm leading-relaxed text-neutral-700">
                Esta Política describe cómo {brandName} recopila, utiliza, resguarda y procesa
                los datos personales y los datos sensibles de salud obtenidos tanto a través del portal
                público de reservas en línea como a través del software de gestión de consultas y
                ficha médica electrónica para profesionales y clínicas de salud en Chile.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-blue-800 shadow-2xs border border-blue-100">
                  <Lock className="h-3 w-3 text-blue-600" /> Cifrado en tránsito y en reposo
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-blue-800 shadow-2xs border border-blue-100">
                  <Database className="h-3 w-3 text-blue-600" /> Aislamiento RLS por clínica
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-blue-800 shadow-2xs border border-blue-100">
                  <UserCheck className="h-3 w-3 text-blue-600" /> No vendemos ni cedemos datos
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sección 1 */}
        <section id="introduccion" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            1. Introducción y Alcance
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-neutral-700">
            La presente Política de Privacidad rige para todos los usuarios de la plataforma{" "}
            <strong>{brandName}</strong>, incluyendo:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-neutral-700">
            <li>
              <strong>Pacientes:</strong> personas que reservan, consultan, reprograman o cancelan
              citas médicas/odontológicas a través del asistente público de reservas o que son atendidos
              en las clínicas adheridas.
            </li>
            <li>
              <strong>Profesionales de la salud y personal de clínica:</strong> médicos, odontólogos,
              asistentes dentales, recepcionistas y administradores que operan el panel profesional
              para gestionar agendas y registrar prestaciones sanitarias.
            </li>
            <li>
              <strong>Organizaciones y clínicas clientes:</strong> centros médicos, clínicas
              odontológicas y consultas privadas que contratan los servicios de software SaaS de {brandName}.
            </li>
          </ul>
        </section>

        {/* Sección 2 */}
        <section id="marco-legal" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            2. Marco Legal Aplicable
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-neutral-700">
            El tratamiento de datos personales en nuestra plataforma se encuentra estrictamente
            regulado y alineado con el ordenamiento jurídico de la República de Chile, especialmente:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-2xs">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4 text-emerald-600" />
                Ley N° 19.628
              </h3>
              <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                Sobre Protección de la Vida Privada. Rige el consentimiento, los principios de licitud,
                finalidad, proporcionalidad y los derechos ARCO de los titulares de datos.
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-2xs">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Ley N° 20.584
              </h3>
              <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                Regula los derechos y deberes que tienen las personas en relación con acciones vinculadas
                a su atención en salud, garantizando la reserva y confidencialidad absoluta de la ficha clínica.
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-2xs">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <Database className="h-4 w-4 text-blue-600" />
                D.S. N° 41 del MINSAL
              </h3>
              <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                Reglamento sobre Fichas Clínicas. Establece requisitos de integridad, autenticidad,
                trazabilidad inmutable de accesos y el plazo de custodia obligatoria de 15 años.
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-2xs">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <KeyRound className="h-4 w-4 text-blue-600" />
                Ley N° 21.459
              </h3>
              <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                Establece normas sobre delitos informáticos y ciberseguridad, sancionando el acceso no
                autorizado, sabotaje informático e interceptación ilícita de sistemas de datos.
              </p>
            </div>
          </div>
        </section>

        {/* Sección 3 */}
        <section id="roles" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            3. Responsable y Encargado del Tratamiento
          </h2>
          <div className="space-y-3 text-sm sm:text-base text-neutral-700 leading-relaxed">
            <p>
              Para garantizar una adecuada distribución de obligaciones de privacidad, distinguimos
              dos roles según la naturaleza del dato:
            </p>
            <div className="space-y-3 pl-2">
              <div className="border-l-3 border-[var(--lp-navy)] pl-4">
                <strong className="text-neutral-900 block">La Clínica u Organización (Responsable del Tratamiento):</strong>
                <span className="text-sm text-neutral-600">
                  Cada centro de salud o profesional independiente que utiliza el sistema es el
                  Responsable del Tratamiento de los datos de sus pacientes, de las decisiones asistenciales
                  y de la información médica vertida en la ficha clínica electrónica.
                </span>
              </div>
              <div className="border-l-3 border-[var(--lp-blue)] pl-4">
                <strong className="text-neutral-900 block">{brandName} (Encargado del Tratamiento y Proveedor Tecnológico):</strong>
                <span className="text-sm text-neutral-600">
                  Actuamos como Encargado del Tratamiento, suministrando la infraestructura tecnológica segura en la
                  nube, bases de datos con Row Level Security y mecanismos de cifrado para procesar la información
                  conforme a las instrucciones contractuales del centro de salud.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Sección 4 */}
        <section id="datos-recolectados" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            4. Datos que Recolectamos
          </h2>
          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
            Recopilamos únicamente los datos necesarios y proporcionales para la prestación de los servicios:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border border-neutral-200 rounded-lg">
              <thead className="bg-neutral-100 text-neutral-800 font-semibold border-b border-neutral-200">
                <tr>
                  <th className="p-3">Categoría</th>
                  <th className="p-3">Datos específicos</th>
                  <th className="p-3">Origen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-neutral-700">
                <tr>
                  <td className="p-3 font-semibold text-neutral-900">Identificación y Contacto</td>
                  <td className="p-3">Nombre, apellidos, RUT, número de teléfono (móvil), correo electrónico.</td>
                  <td className="p-3">Formulario de reserva o ficha de admisión.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-neutral-900">Gestión de Citas</td>
                  <td className="p-3">Día, hora, profesional solicitado, servicio clínico seleccionado, estado de la cita (confirmada, cancelada, completada).</td>
                  <td className="p-3">Motor de agendamiento online.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-neutral-900">Datos Sensibles de Salud</td>
                  <td className="p-3">Anamnesis, antecedentes médicos/alergias, diagnósticos, evolución, periodontograma, recetas y consentimientos.</td>
                  <td className="p-3">Ingresado exclusivamente por el profesional autorizado.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-neutral-900">Datos de Acceso y Profesionales</td>
                  <td className="p-3">RUT profesional, credenciales cifradas (hash seguro), rol (admin, profesional, recepción), registros de auditoría.</td>
                  <td className="p-3">Administración de la clínica.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-neutral-900">Datos Técnicos y Telemáticos</td>
                  <td className="p-3">Dirección IP, agente de usuario (navegador), timestamp de operaciones, tokens de sesión HttpOnly.</td>
                  <td className="p-3">Generados automáticamente por motivos de seguridad.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Sección 5 */}
        <section id="finalidades" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            5. Finalidades del Tratamiento
          </h2>
          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
            Tratamos los datos con las siguientes finalidades legítimas y explícitas:
          </p>
          <ul className="space-y-2.5 text-sm sm:text-base text-neutral-700 list-disc pl-5">
            <li>
              <strong>Gestión integral de citas médicas:</strong> reserva, asignación de horarios,
              bloqueo contra doble reserva concurrente, confirmación y reprogramación de horas.
            </li>
            <li>
              <strong>Comunicaciones de servicio:</strong> envío de comprobantes de reserva por correo electrónico
              y recordatorios de atención para reducir el ausentismo de pacientes.
            </li>
            <li>
              <strong>Gestión de la Ficha Médica Electrónica:</strong> permitir al equipo clínico el
              registro asistencial obligatorio establecido en el Código Sanitario y la Ley 20.584.
            </li>
            <li>
              <strong>Autenticación y seguridad de cuentas:</strong> verificación de identidad de los
              profesionales de la salud mediante RUT y contraseña segura, control de permisos RBAC
              y mitigación de ataques automatizados con rate limiting.
            </li>
            <li>
              <strong>Trazabilidad y auditoría clínica legal:</strong> registro inmutable de qué usuario
              accedió, visualizó o modificó una ficha clínica determinada, en cumplimiento de la normativa sanitaria.
            </li>
          </ul>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-xs sm:text-sm text-amber-900">
            <strong>Garantía de No Monetización:</strong> {brandName} no comercializa, no arrienda ni cede
            datos de pacientes a empresas farmacéuticas, aseguradoras ni redes de publicidad digital.
          </div>
        </section>

        {/* Sección 6 */}
        <section id="datos-salud" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            6. Tratamiento Especial de Datos Sensibles y Ficha Clínica
          </h2>
          <div className="space-y-3 text-sm sm:text-base text-neutral-700 leading-relaxed">
            <p>
              Conforme al artículo 10 de la Ley N° 19.628 y a la Ley N° 20.584, los datos relativos a los
              estados de salud físicos o psíquicos de las personas constituyen <strong>datos sensibles</strong>,
              sometidos al más estricto secreto profesional.
            </p>
            <div className="rounded-xl border border-neutral-200 p-4 space-y-2 bg-neutral-50/50">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-[var(--lp-blue)]" />
                Reglas aplicadas al módulo de Ficha Clínica:
              </h3>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-neutral-600">
                <li>
                  <strong>Aislamiento estricto:</strong> Ningún paciente ni clínica puede visualizar datos de otra
                  organización. El motor de base de datos aplica políticas de seguridad por fila (Row Level Security).
                </li>
                <li>
                  <strong>Privilegios restringidos:</strong> El personal de recepción o agendamiento solo visualiza
                  datos de contacto y citas; no tiene acceso al contenido de las evoluciones médicas ni antecedentes íntimos.
                </li>
                <li>
                  <strong>Tokens de gestión de cita con Hash:</strong> Los enlaces públicos para gestionar o cancelar
                  una cita utilizan un token criptográfico efímero cuyo hash SHA-256 es el único guardado en la base de datos.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Sección 7 */}
        <section id="seguridad" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            7. Seguridad y Cifrado de la Información
          </h2>
          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
            Implementamos salvaguardas técnicas y organizativas de nivel bancario y sanitario para
            evitar la pérdida, mal uso, alteración o acceso no autorizado:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="border border-neutral-200 rounded-lg p-4 bg-white">
              <strong className="text-neutral-900 block mb-1">Cifrado en Tránsito</strong>
              <p className="text-neutral-600">
                Toda la comunicación entre tu navegador y nuestros servidores viaja cifrada mediante HTTPS
                y certificados TLS 1.3 con suites criptográficas modernas.
              </p>
            </div>
            <div className="border border-neutral-200 rounded-lg p-4 bg-white">
              <strong className="text-neutral-900 block mb-1">Cifrado en Reposo</strong>
              <p className="text-neutral-600">
                Las bases de datos relacionales PostgreSQL y los archivos clínicos adjuntos se almacenan
                cifrados mediante algoritmos AES-256 en reposo.
              </p>
            </div>
            <div className="border border-neutral-200 rounded-lg p-4 bg-white">
              <strong className="text-neutral-900 block mb-1">Row Level Security (RLS)</strong>
              <p className="text-neutral-600">
                La autorización no depende solo del código web; el propio motor PostgreSQL deniega consultas
                que no pertenezcan al identificador de la organización del usuario autenticado.
              </p>
            </div>
            <div className="border border-neutral-200 rounded-lg p-4 bg-white">
              <strong className="text-neutral-900 block mb-1">Cookies de Sesión HttpOnly</strong>
              <p className="text-neutral-600">
                Las credenciales y tokens JWT de sesión se almacenan en cookies con flags HttpOnly,
                SameSite y Secure, impidiendo ataques de robo de sesión mediante XSS.
              </p>
            </div>
          </div>
        </section>

        {/* Sección 8 */}
        <section id="retencion" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            8. Plazos de Conservación de Datos
          </h2>
          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
            Los datos son conservados durante los plazos legalmente exigibles según su tipología:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-neutral-700">
            <li>
              <strong>Fichas Clínicas Electrónicas:</strong> Mínimo legal de <strong>15 años</strong> conforme
              al artículo 13 de la Ley N° 20.584 y Reglamento D.S. 41 del MINSAL, contados desde la última
              atención registrada en el establecimiento.
            </li>
            <li>
              <strong>Historial de reservas y citas administrativas:</strong> Se conservan durante <strong>5 años</strong> como
              documentación de respaldo administrativo y contable.
            </li>
            <li>
              <strong>Registros técnicos de acceso y auditoría:</strong> Mantenidos por un periodo de <strong>2 años</strong> para
              fines de seguridad informática y control de incidentes.
            </li>
          </ul>
        </section>

        {/* Sección 9 */}
        <section id="derechos-arco" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            9. Derechos ARCO y Procedimiento para Ejercerlos
          </h2>
          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
            En virtud de la Ley N° 19.628, los titulares de datos tienen en todo momento derecho a:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
              <strong className="text-neutral-900">Acceso:</strong> Solicitar copia y conocer qué datos personales constan en el sistema.
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
              <strong className="text-neutral-900">Rectificación:</strong> Exigir la corrección de datos inexactos, erróneos o incompletos.
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
              <strong className="text-neutral-900">Cancelación / Eliminación:</strong> Solicitar el borrado de datos cuando no exista obligación legal de custodia.
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
              <strong className="text-neutral-900">Oposición:</strong> Oponerse al tratamiento de datos cuando no medie consentimiento o interés legítimo.
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 p-4 bg-white text-xs sm:text-sm text-neutral-700 space-y-2">
            <strong className="text-neutral-900 block">¿Cómo ejercer estos derechos?</strong>
            <p>
              Puedes enviar una solicitud formal por escrito al correo electrónico{" "}
              <a href={`mailto:${contactEmail}`} className="font-semibold text-blue-700 underline">
                {contactEmail}
              </a>
              , adjuntando una copia de tu Cédula de Identidad (o documento que acredite representación
              legal). Nuestro equipo responderá dentro del plazo legal de <strong>10 días hábiles</strong>.
            </p>
            <p className="text-xs text-neutral-500 italic">
              *Nota sanitaria: La solicitud de eliminación de datos de una Ficha Clínica no procederá si
              choca con el deber legal de custodia médica obligatoria por 15 años impuesto por el MINSAL.
            </p>
          </div>
        </section>

        {/* Sección 10 */}
        <section id="destinatarios" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            10. Destinatarios y Subencargados del Tratamiento
          </h2>
          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
            Para la operación técnica de la nube, {brandName} contrata proveedores de infraestructura
            altamente calificados con certificaciones SOC 2 Type II e ISO 27001:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-neutral-700">
            <li>
              <strong>Alojamiento y Base de Datos:</strong> Supabase Inc. (PostgreSQL gestionado con RLS y cifrado en centros de datos con altos estándares).
            </li>
            <li>
              <strong>Servicio de Correo Transaccional:</strong> Resend Inc. (envío de confirmaciones de cita y recordatorios; los correos no contienen fichas clínicas completas).
            </li>
            <li>
              <strong>Protección perimetral y mitigación DDoS:</strong> Cloudflare Inc. (protección contra ciberataques y firewall de aplicaciones).
            </li>
          </ul>
        </section>

        {/* Sección 11 */}
        <section id="menores" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            11. Tratamiento de Datos de Menores de Edad
          </h2>
          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
            En el caso de pacientes pediátricos o menores de 18 años, la reserva de cita y la información
            asistencial deben ser ingresadas o autorizadas por sus padres, tutores o representantes
            legales facultados de conformidad con las disposiciones de la Ley N° 20.584 y el Código Civil chileno.
          </p>
        </section>

        {/* Sección 12 */}
        <section id="contacto" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            12. Actualizaciones y Canal de Contacto
          </h2>
          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
            Podremos actualizar la presente Política para reflejar mejoras en la plataforma o cambios
            normativos. Toda modificación sustancial será notificada a través del sitio web con indicación
            de su fecha de entrada en vigencia.
          </p>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs sm:text-sm text-neutral-700">
            <p>
              <strong>Oficina de Privacidad y Cumplimiento de Datos:</strong>
            </p>
            <p className="mt-1">
              Plataforma {brandName} · República de Chile.
            </p>
            <p>
              Correo directo:{" "}
              <a href={`mailto:${contactEmail}`} className="font-semibold text-blue-700 hover:underline">
                {contactEmail}
              </a>
            </p>
          </div>
        </section>
      </div>
    </LegalLayout>
  );
}
