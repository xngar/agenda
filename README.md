# Agenda Online — sistema de reservas odontológicas

Aplicación de reservas de hora para una clínica odontológica: el paciente
elige servicio, profesional, día y hora desde el sitio público; el equipo
atiende las citas desde un panel privado. Funciona en español, con una sola
zona horaria (`America/Santiago`).

## Qué incluye

**Sitio público**

- `/` — servicios, equipo y datos de la clínica.
- `/reservar` — asistente de 4 pasos (servicio → profesional → día y hora →
  datos), con validación en cliente que nunca ofrece horas ya tomadas. La cita
  nace **«por confirmar»**: el horario queda reservado desde el primer
  momento y la clínica la confirma desde el panel.
- `/cita/[token]` — confirmación y enlace para cambiar o cancelar la cita.
- `/privacidad` — aviso de privacidad.

**Panel profesional** (`/dashboard`)

- Ingreso con RUT y contraseña.
- Agenda del día con filtros, cambio de estado (por confirmar, confirmada,
  atendida, no asistió, cancelada) y suscripción en vivo vía Realtime.
- El administrador ve las citas de todo el equipo, y puede activar o
  desactivar cuentas; el resto, sólo las propias.

## Requisitos

- Node.js 20 o superior.
- Un proyecto Supabase (Postgres con las migraciones de `supabase/migrations`).

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # y completar los valores
npm run dev                  # http://localhost:3000
```

Las variables necesarias están documentadas en `.env.example`. Sólo tres son
obligatorias para operar: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`. Las demás
degradan con elegancia (Turnstile, Upstash y Resend son opcionales en
desarrollo).

Para datos de prueba: `npm run seed:dev`.

## Cómo probarlo a mano

Dos cuentas quedan en la base de desarrollo, con la misma contraseña
`AgendaDev2026!`:

| Cuenta | Rol |
| --- | --- |
| `camila.rojas@clinicadental.test` | Administradora: ve todo el equipo y gestiona las cuentas. |
| `sebastian.munoz@clinicadental.test` | Profesional: sólo su propia agenda. |

Para recorrer el flujo completo:

1. Levanta el servidor (`npm run dev`, o `npm run build` + `npm start`).
2. En una ventana aparte, entra en `/reservar` y agenda una hora. La reserva
   nace **Por confirmar**.
3. En el panel, entra con la cuenta que quieras y abre `/dashboard`. Si
   reservaste para una fecha que no es hoy, navega a ella con `?date=AAAA-MM-DD`
   — la agenda abre en el día actual.
4. La cita aparece con su botón **Confirmar**. Al confirmar, el estado pasa a
   *Confirmada* y se avisa al profesional.

`node scripts/demo-panel.mjs` hace todo eso de forma automática, comprueba lo
que se ve en pantalla en las tres vistas (admin sin filtro, admin filtrado y
profesional) y deja capturas en `C:/Users/xngar/AppData/Local/Temp/opencode/shots`.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` / `npm start` | Build y ejecución en modo producción. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | TypeScript sin emitir. |
| `npm run test` | Pruebas unitarias (Vitest). |
| `npm run e2e` | Pruebas de navegador (Playwright, contra el build). |
| `npm run check` | lint + typecheck + test. |
| `npm run seed:dev` | Carga datos de desarrollo. |
| `node scripts/panel-check.mjs` | Verificación HTTP/RLS contra el servidor, incluidos los permisos del panel. |
| `node scripts/demo-panel.mjs` | Reserva una cita y comprueba las tres vistas del panel con capturas. |

`npm run e2e` necesita el servidor levantado (`npm start`) y, si no es en
el puerto 3000, `E2E_BASE_URL=http://localhost:3111`.

## Arquitectura

```
app/                 rutas de Next (App Router)
  page.tsx           portada
  reservar/          asistente público
  cita/[token]/      gestión de cita con token
  dashboard/         panel privado (+ /login)
  api/               rutas: bookings, slots, auth, dashboard, cron
lib/
  dates.ts           fechas de la clínica (día = clave "yyyy-MM-dd")
  range.ts           lectura de tstzrange de Postgres
  booking.ts         alta de citas y disponibilidad (sólo servidor)
  rut.ts             validación de RUT chileno
  ics.ts             adjunto .ics en UTC
  auth.ts            sesión del profesional
components/          UI compartida
supabase/migrations/ esquema, RPC, RLS, Realtime y seed
tests/               pruebas unitarias
e2e/                 pruebas de navegador
```

Tres ideas que conviene conocer antes de tocar el código:

1. **El día es una clave, no una fecha.** Un día hábil es `"2026-10-05"` y se
   maneja siempre en UTC. Sumar días con la zona local del navegador hacía
   que un lunes apareciera como domingo.
2. **La disponibilidad se calcula en Postgres.** Las horas salen de
   `availability_rules` menos `time_off`, menos feriados y menos las citas
   que ya existen. No hay "slots" precalculados que puedan quedar viejos.
3. **RLS es la autoridad.** El panel usa un cliente Supabase con cookie de
   sesión; cada consulta pasa por las políticas. El `proxy.ts` sólo evita
   mostrar la pantalla de carga a quien no tiene sesión, no autoriza nada.

## Seguridad

- Contraseñas con `bcrypt`; sesión en cookie `httpOnly` + `sameSite=lax`.
- Gestión de cita por token cifrado (AES-256-GCM) y de un solo uso.
- Rate limiting por IP en booking y login (Upstash en producción).
- Turnstile en el formulario; la CSP lo permite explícitamente.
- Sin datos sensibles en los logs.

## Base de datos

Las migraciones se aplican en orden y son la única fuente de verdad del
esquema. Las tres últimas resuelven problemas que sólo se ven en producción:

- `...0010` agrega la RPC `dashboard_appointments`, que resuelve el
  solapamiento de `tstzrange` en el servidor: filtrar un rango con `>=`/`<=`
  contra otro rango **no funciona** en Postgres y devuelve `malformed range
  literal`, que es como la agenda del panel aparecía vacía.
- `...0011` hace que una reserva nueva nazca `pending`. Antes el estado
  existía en el CHECK y en los índices, pero nadie lo generaba: era
  inalcanzable y el botón «Confirmar» nunca se pintaba.
- `...0012` hace que `get_available_slots` respete `doctors.active`, que no
  contemplaba. El resultado era mostrarle horas a un profesional desactivado
  para negárselas al confirmar.

Para partir de cero: `npm run db:test` (resetea y aplica todo).