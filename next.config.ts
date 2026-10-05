import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad.
 *
 * `Referrer-Policy: no-referrer` es la más importante para este producto:
 * las páginas /cita/[token] llevan el token de gestión en la ruta, y sin
 * esto el navegador lo enviaría en el Referer a cualquier recurso de
 * terceros (favicon externo, analytics, etc.).
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    // No usamos cámara ni micrófono: la clínica no hace video ni el
    // paciente sube archivos con cámara.
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const isDev = process.env.NODE_ENV !== "production";

/**
 * El widget de Turnstile carga un script desde Cloudflare.
 *
 * Con sólo `frame-src` el iframe se autoriza pero el `<script>` no, así
 * que el navegador lo bloqueaba y el widget nunca renderizaba. Conviene
 * añadir ambos orígenes: el script que renderiza el iframe y el propio
 * iframe que lo aloja.
 */
const turnstile = [
  "https://challenges.cloudflare.com",
  "https://challenges.cloudflare.com/cdn-cgi/challenge-platform",
];

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next inyecta scripts con hash/inline en desarrollo y runtime.
  [
    isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
    ...turnstile,
  ].join(" "),
  // Tailwind y los estilos inline de los componentes.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // El widget de Turnstile carga desde Cloudflare; si se omite la site key
  // no se pide nada externo, pero dejarlo permitido no agrega superficie real.
  ["frame-src 'self'", ...turnstile].join(" "),
  [
    "connect-src 'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    ...turnstile,
  ].join(" "),
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  isDev ? "" : "upgrade-insecure-requests",
]
  .filter(Boolean)
  .join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
      {
        // Las respuestas con token nunca se cachean, ni en el CDN ni en el
        // navegador.
        source: "/cita/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
