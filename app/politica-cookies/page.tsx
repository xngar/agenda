import type { Metadata } from "next";
import LegalLayout, { type TocItem } from "@/components/legal/legal-layout";
import { siteConfig } from "@/lib/site-config";
import { Cookie, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Cookies",
  description:
    "Transparencia sobre el uso de cookies técnicas, de autenticación y de seguridad en nuestra plataforma de agenda y ficha clínica en Chile.",
};

const toc: TocItem[] = [
  { id: "que-son", title: "1. ¿Qué son las cookies?" },
  { id: "sin-publicidad", title: "2. Sin Rastreo Publicitario" },
  { id: "tipos-cookies", title: "3. Tipos de Cookies Utilizadas" },
  { id: "tabla-cookies", title: "4. Inventario Detallado de Cookies" },
  { id: "almacenamiento-local", title: "5. Almacenamiento Local (Storage)" },
  { id: "terceros", title: "6. Cookies de Infraestructura y Terceros" },
  { id: "como-desactivar", title: "7. Cómo Configurar tu Navegador" },
  { id: "impacto", title: "8. Impacto de Desactivar Cookies" },
  { id: "contacto", title: "9. Actualizaciones y Contacto" },
];

export default function PoliticaCookiesPage() {
  const brandName = siteConfig.name !== "[Nombre]" ? siteConfig.name : "Agenda Online / Gethour";
  const contactEmail = siteConfig.email !== "[correo]" ? siteConfig.email : "contacto@gethour.cl";

  return (
    <LegalLayout
      title="Política de Cookies"
      subtitle={`En ${brandName} utilizamos cookies estrictamente para autenticación segura, prevención de abusos y operatividad del sistema de agendamiento médico.`}
      badge="Transparencia Tecnológica & Privacidad"
      lastUpdated="Noviembre 2026"
      toc={toc}
    >
      <div className="space-y-12">
        {/* Banner de cookies */}
        <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Cookie className="h-6 w-6 text-blue-700 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h2 className="text-base font-bold text-[var(--lp-navy)]">
                Nuestra Filosofía: Solo Cookies Necesarias
              </h2>
              <p className="text-sm leading-relaxed text-neutral-700">
                A diferencia de sitios web comerciales convencionales, <strong>no utilizamos cookies de rastreo publicitario
                ni redes de retargeting</strong> (como Facebook Pixel o Google Ads). Toda cookie emitida por {brandName}
                tiene un fin técnico legítimo, de seguridad o de preservación de la sesión clínica.
              </p>
            </div>
          </div>
        </div>

        {/* Sección 1 */}
        <section id="que-son" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            1. ¿Qué son las cookies?
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-neutral-700">
            Una <em>cookie</em> es un pequeño archivo de texto que un sitio web descarga en tu ordenador, teléfono
            o dispositivo móvil cuando accedes a determinadas páginas. Las cookies permiten al servidor reconocer
            el dispositivo del usuario, mantener iniciada una sesión privada, verificar autenticidad de peticiones y
            recordar preferencias operativas de navegación.
          </p>
        </section>

        {/* Sección 2 */}
        <section id="sin-publicidad" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            2. Compromiso: Sin Rastreo Publicitario de Pacientes
          </h2>
          <div className="space-y-3 text-sm sm:text-base text-neutral-700 leading-relaxed">
            <p>
              En el contexto sanitario y odontológico, la confidencialidad es primordial. Por ello, declaramos que:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <div className="flex items-center gap-1.5 font-bold text-neutral-900 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Sin Redes Publicitarias</span>
                </div>
                <p className="text-neutral-600">
                  No insertamos píxeles de seguimiento ni compartimos identificadores con corredores de datos
                  ni anunciantes externos.
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <div className="flex items-center gap-1.5 font-bold text-neutral-900 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Sin Huella Digital Cruzada</span>
                </div>
                <p className="text-neutral-600">
                  La navegación de un paciente al reservar una hora médica no es vinculada con sus perfiles
                  en redes sociales o plataformas de consumo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Sección 3 */}
        <section id="tipos-cookies" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            3. Tipos de Cookies que Utilizamos
          </h2>
          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
            Clasificamos las cookies empleadas según su propósito operativo:
          </p>
          <div className="space-y-4 text-sm sm:text-base text-neutral-700">
            <div className="border-l-3 border-blue-600 pl-4 py-1">
              <strong className="text-neutral-900 block">a) Cookies Técnicas y Esenciales (Obligatorias):</strong>
              <p className="text-neutral-600 text-xs sm:text-sm mt-0.5">
                Son indispensables para el funcionamiento básico del software. Permiten iniciar sesión al personal
                médico, navegar entre pantallas protegidas del panel y prevenir falsificaciones de peticiones en
                sitios cruzados (CSRF). No pueden desactivarse en nuestros sistemas.
              </p>
            </div>
            <div className="border-l-3 border-emerald-600 pl-4 py-1">
              <strong className="text-neutral-900 block">b) Cookies de Seguridad y Detección de Abusos:</strong>
              <p className="text-neutral-600 text-xs sm:text-sm mt-0.5">
                Ayudan a mitigar ataques de fuerza bruta al formulario de inicio de sesión de las clínicas y
                evitan que robots maliciosos acaparen o reserven horas falsas masivamente.
              </p>
            </div>
            <div className="border-l-3 border-amber-500 pl-4 py-1">
              <strong className="text-neutral-900 block">c) Cookies de Funcionalidad y Preferencias:</strong>
              <p className="text-neutral-600 text-xs sm:text-sm mt-0.5">
                Permiten recordar la vista seleccionada por el profesional (vista mensual, semanal o diaria)
                y filtros de calendario para evitar tener que reconfigurarlos en cada visita.
              </p>
            </div>
          </div>
        </section>

        {/* Sección 4 */}
        <section id="tabla-cookies" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            4. Inventario Detallado de Cookies
          </h2>
          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
            A continuación se presenta el detalle transparente de las cookies técnicas que intervienen en la aplicación:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border border-neutral-200 rounded-lg">
              <thead className="bg-neutral-100 text-neutral-800 font-semibold border-b border-neutral-200">
                <tr>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Emisor</th>
                  <th className="p-3">Propósito</th>
                  <th className="p-3">Duración</th>
                  <th className="p-3">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-neutral-700">
                <tr>
                  <td className="p-3 font-mono font-semibold text-neutral-900">sb-access-token</td>
                  <td className="p-3">Propio / Supabase</td>
                  <td className="p-3">Token JWT de autenticación para validar la sesión del profesional (HttpOnly, Secure).</td>
                  <td className="p-3">1 hora (renovable)</td>
                  <td className="p-3 font-medium text-blue-700">Técnica / Esencial</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono font-semibold text-neutral-900">sb-refresh-token</td>
                  <td className="p-3">Propio / Supabase</td>
                  <td className="p-3">Token criptográfico de refresco para mantener la sesión activa sin solicitar clave repetidamente.</td>
                  <td className="p-3">Hasta 30 días</td>
                  <td className="p-3 font-medium text-blue-700">Técnica / Esencial</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono font-semibold text-neutral-900">cf_clearance / __cf_bm</td>
                  <td className="p-3">Cloudflare</td>
                  <td className="p-3">Gestión de seguridad perimetral, verificación antibot Turnstile y protección DDoS.</td>
                  <td className="p-3">30 min a 1 año</td>
                  <td className="p-3 font-medium text-emerald-700">Seguridad</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono font-semibold text-neutral-900">agenda_view_pref</td>
                  <td className="p-3">Propio</td>
                  <td className="p-3">Guarda la preferencia visual del panel de citas (mes, semana o día).</td>
                  <td className="p-3">1 año</td>
                  <td className="p-3 font-medium text-amber-700">Funcionalidad</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Sección 5 */}
        <section id="almacenamiento-local" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            5. Almacenamiento Local (localStorage y sessionStorage)
          </h2>
          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
            Además de las cookies HTTP, la aplicación web puede utilizar la API de almacenamiento web del navegador
            (HTML5 Storage) para mejorar el rendimiento y la experiencia de usuario:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-neutral-700">
            <li>
              <strong>sessionStorage:</strong> Conserva temporalmente el estado del paso a paso en el asistente de
              reserva (fecha seleccionada, profesional escogido) mientras se completa el formulario. Se destruye de forma
              automática al cerrar la pestaña del navegador.
            </li>
            <li>
              <strong>localStorage:</strong> Puede almacenar banderas de interfaz (por ejemplo, haber descartado un banner
              informativo) para que no vuelva a desplegarse en la misma máquina.
            </li>
          </ul>
        </section>

        {/* Sección 6 */}
        <section id="terceros" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            6. Cookies de Infraestructura y Terceros
          </h2>
          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
            Nuestros proveedores de infraestructura tecnológica actúan bajo estrictas cláusulas de confidencialidad y
            tratamiento de datos:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <strong className="text-neutral-900 block mb-1">Supabase Auth</strong>
              <p className="text-neutral-600">
                Gestiona los tokens criptográficos de sesión en cookies con flag HttpOnly, imposibles de leer mediante
                scripts del navegador, blindando contra ataques XSS.
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <strong className="text-neutral-900 block mb-1">Cloudflare Turnstile</strong>
              <p className="text-neutral-600">
                Verifica de manera no intrusiva y sin CAPTCHAs visuales invasivos que la petición proviene de un humano
                real, protegiendo las reservas públicas.
              </p>
            </div>
          </div>
        </section>

        {/* Sección 7 */}
        <section id="como-desactivar" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            7. Cómo Gestionar o Desactivar las Cookies en tu Navegador
          </h2>
          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
            Puedes permitir, bloquear o eliminar las cookies instaladas en tu equipo mediante la configuración
            de las opciones de tu navegador web. A continuación te indicamos los accesos oficiales:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <a
              href="https://support.google.com/chrome/answer/95647"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-center font-medium text-neutral-700 hover:border-neutral-400 hover:text-blue-700 transition-colors"
            >
              Google Chrome
            </a>
            <a
              href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-center font-medium text-neutral-700 hover:border-neutral-400 hover:text-blue-700 transition-colors"
            >
              Mozilla Firefox
            </a>
            <a
              href="https://support.apple.com/es-es/guide/safari/sfri11471/mac"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-center font-medium text-neutral-700 hover:border-neutral-400 hover:text-blue-700 transition-colors"
            >
              Apple Safari
            </a>
            <a
              href="https://support.microsoft.com/es-es/windows/administrar-cookies-en-microsoft-edge-ver-permitir-bloquear-eliminar-y-usar-168dab11-0753-043d-7c16-ede5947fc64d"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-center font-medium text-neutral-700 hover:border-neutral-400 hover:text-blue-700 transition-colors"
            >
              Microsoft Edge
            </a>
          </div>
        </section>

        {/* Sección 8 */}
        <section id="impacto" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            8. Impacto de Desactivar las Cookies Técnicas
          </h2>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-2 text-xs sm:text-sm text-neutral-700">
            <p>
              Debido a que nuestras cookies son de naturaleza estrictamente técnica y de seguridad:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-600">
              <li>
                Si bloqueas las cookies técnicas en tu navegador, <strong>no será posible iniciar sesión en el panel profesional</strong>,
                ya que el sistema no podrá mantener la sesión autenticada con la base de datos de manera segura.
              </li>
              <li>
                El asistente público de reservas podría presentar dificultades al confirmar horarios o verificar el token de seguridad.
              </li>
            </ul>
          </div>
        </section>

        {/* Sección 9 */}
        <section id="contacto" className="space-y-4 scroll-mt-28">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            9. Actualizaciones y Canal de Contacto
          </h2>
          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
            Podremos modificar esta Política de Cookies en función de exigencias normativas o técnicas.
            Cualquier cambio relevante será publicado en este mismo apartado.
          </p>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs sm:text-sm text-neutral-700">
            <p className="font-semibold text-neutral-900">¿Tienes dudas sobre nuestras cookies?</p>
            <p className="mt-1">
              Escríbenos directamente a:{" "}
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
