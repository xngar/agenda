# Agenda Online

Sistema de reservas de citas para clínicas. El paciente elige servicio, profesional, día y hora desde el sitio público; la cita nace **por confirmar** y el equipo la gestiona desde un panel privado. Opera en español con zona horaria `America/Santiago`.

## ¿Qué incluye?

**Sitio público**
- `/` - Portada con información de la clínica
- `/reservar` - Asistente de reserva (servicio → profesional → día y hora → datos), con validación que nunca ofrece horas ya tomadas
- `/cita/[token]` - Gestión de cita con token para confirmar, reprogramar o cancelar
- `/privacidad` - Aviso de privacidad
- Soporte para multi-tenant vía slug de clínica (`/[clinicSlug]/...`)

**Panel profesional** (`/dashboard`)
- Login con RUT y contraseña
- Agenda del día con filtros por profesional
- Cambio de estado (pending, confirmed, attended/completed según contexto, cancelled, no_show)
- Notificaciones y suscripción en tiempo real vía Supabase Realtime
- Roles: admin (ve todo el equipo), profesional (ve su agenda), recepción (acceso limitado según configuración)
- Gestión de doctores, servicios, disponibilidad, feriados y permisos de ausencia

**Ficha Médica Electrónica** (solo profesionales autorizados)
- Gestión de pacientes, antecedentes, encuestas, tratamientos, periodoncia
- Prescripciones, consentimiento informado, archivos adjuntos
- Exportación PDF de ficha
- Registro de auditoría

## Requisitos

- **Node.js**: 20 o superior
- **Base de datos**: Proyecto Supabase con PostgreSQL
- **Extensiones PostgreSQL**: `btree_gist`, `pgcrypto` (aplicadas via migraciones)

## Instalación y puesta en marcha

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd agenda
npm install
```

### 2. Configurar variables de entorno

Crear archivo `.env.local` a partir de `.env.example`:

```bash
cp .env.example .env.local  # En Windows, copiar archivo manualmente
```

Completar al menos las variables obligatorias:

- `NEXT_PUBLIC_SUPABASE_URL` - URL del proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Clave anónima Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Clave service role (solo para servidor)
- `MANAGE_TOKEN_KEY` - Clave para tokens de gestión (mín. 16 chars). Generar con: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

**Variables opcionales (degradan graciosamente):**
- `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` - Envío de correos (si faltan, se loguean en consola)
- `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` - Cloudflare Turnstile (captcha)
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` - Rate limiting (usa Map in-memory si faltan)
- `CRON_SECRET` - Autenticación para `/api/cron/reminders`
- `NEXT_PUBLIC_APP_URL` - URL base de la app (default: http://localhost:3000)

### 3. Aplicar migraciones en Supabase

Las migraciones están en `supabase/migrations/` con orden cronológico. Aplicarlas con Supabase CLI:

```bash
supabase db push  # o supabase db reset para desarrollo local
```

### 4. Cargar datos de desarrollo (opcional)

```bash
npm run seed:dev
```

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

### 6. Build y producción

```bash
npm run build
npm run start
```

## Cuentas de desarrollo (seed)

Al ejecutar `npm run seed:dev`, se crean las siguientes cuentas (misma contraseña: `AgendaDev2026!`):

| Email | Rol |
|---|---|
| `camila.rojas@clinicadental.test` | Administradora (ve todo el equipo, gestiona cuentas) |
| `sebastian.munoz@clinicadental.test` | Profesional (ve su propia agenda) |

**POR CONFIRMAR**: Estas cuentas son solo para desarrollo local con datos seed. No existen en producción.

## Flujos de prueba manual

1. Ir a `/reservar` y completar asistente. La cita nace **por confirmar** (estado `pending`).
2. Ir a `/dashboard/login` e iniciar sesión con cuenta de desarrollo.
3. En `/dashboard`, la cita aparece con opción **Confirmar** (cambia estado a `confirmed`).
4. Ver gestión vía token en `/cita/[token]`.

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor desarrollo |
| `npm run build` | Build producción |
| `npm run start` | Ejecutar build |
| `npm run lint` | Linting |
| `npm run typecheck` | Type checking sin emitir |
| `npm run test` | Tests unitarios |
| `npm run test:watch` | Tests watch |
| `npm run test:coverage` | Coverage |
| `npm run e2e` | Tests E2E (requiere servidor corriendo; config `E2E_BASE_URL` si puerto distinto) |
| `npm run check` | lint + typecheck + test |
| `npm run check:panel` | Verificación HTTP/RLS (`node scripts/panel-check.mjs`) |
| `npm run seed:dev` | Datos dev |
| `npm run db:test` | Reset DB solo |

## Estructura general

```
app/          # Rutas App Router (público, dashboard, API)
lib/          # Lógica compartida (auth, booking, dates, supabase, etc.)
components/   # Componentes UI reutilizables
supabase/     # Migraciones SQL y tests
tests/        # Tests unitarios Vitest
e2e/          # Tests E2E Playwright
scripts/      # Utilidades
docs/         # Documentación
```

Ver `docs/ARQUITECTURA.md` para detalles completos.

## Notas de seguridad

- **RLS obligatorio**: Autoridad real está en PostgreSQL.
- **Tokens**: `manage_token_hash` (SHA-256 hex) del token en claro; nunca se almacena token.
- **Auth**: Supabase Auth con RUT + contraseña.
- **Zod**: Validación en server-side.
- **Fail-fast**: Config inválida rompe arranque.
- **Rate limiting + Turnstile**: Opcionales con fallback seguro para desarrollo.

**POR CONFIRMAR**: Configuraciones específicas de producción (dominio, SMTP real, Redis Upstash, claves Turnstile).