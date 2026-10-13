# ARQUITECTURA.md

## Capas del sistema

El proyecto sigue arquitectura por capas con Next.js 16 App Router:

| Capa | Ubicación | Responsabilidad |
|---|---|---|
| **Presentación (UI)** | `app/`, `components/` | Páginas, componentes React, layouts. Componentes cliente marcan `"use client"`. |
| **API Routes** | `app/api/` | Handlers REST (route.ts). Validación, autenticación, orquestación. Solo servidor. |
| **Lógica de negocio** | `lib/` | Reglas de negocio (booking, availability, dates, token, etc.), validación, helpers. Muchos usan `server-only`. |
| **Acceso a datos** | `lib/supabase/` | Clientes Supabase: `server.ts` (cookies SSR), `browser.ts` (cliente), `admin.ts` (service role, solo servidor). |
| **Persistencia** | `supabase/migrations/` | Esquema PostgreSQL, funciones SQL (RPC), políticas RLS, triggers, índices. |
| **Notificaciones/Email** | `lib/email/` | Envío de emails via Resend con plantillas. Fallback a console.log si no configurado. |

## Módulos principales

### 1. Reservas públicas (Booking)
- Flujo: servicio → profesional → día → hora → datos personales
- Crea cita con estado `pending` ("por confirmar")
- Reserva horario al crear cita (evita doble reserva)
- Token de gestión: `manage_token_hash = sha256(tokenClaro)`. Token en claro **nunca** se guarda.
- Validación: Zod + reglas de negocio (min notice hours, max days ahead, holidays, time-off, active doctors).

Ubicaciones: `app/(site)/reservar/`, `app/api/bookings/`, `lib/booking.ts`, `lib/token.ts`, `app/cita/[token]/`.

### 2. Panel profesional (Dashboard)
- Autenticación con RUT+password via Supabase Auth
- Roles: `is_admin` (doctor), `is_super_admin` (platform), recepción tiene permisos específicos (migración 20261008000001, 20260107000020)
- Agenda diaria con filtros
- Cambio de estados de cita
- Realtime suscripciones a cambios
- Gestión: doctores, servicios, disponibilidad (rules), feriados, time-off
- RPCs para consultas optimizadas (dashboard_appointments, etc.)

Ubicaciones: `app/dashboard/`, `app/api/dashboard/`, `components/dashboard/`.

### 3. Ficha clínica (EHR-lite)
- Pacientes, encuentros (encounters), antecedentes, tratamientos, periodoncia, prescripciones
- Consentimientos, archivos adjuntos, catálogo de procedimientos
- Exportación PDF, versiones de encuentros, auditoría (audit log)
- Acceso restringido a roles autorizados. RLS fuerte por org_id.

Ubicaciones: `app/api/ficha/`, `lib/ficha/`, migraciones `20260102000005_*` a `20260106000016_*`.

### 4. Multi-tenant
- Organizaciones (`organizations`) con `slug`, `timezone` (default `America/Santiago`), límites (slot_step_min, min_notice_hours, max_days_ahead, cancel_min_hours)
- Mayoría de tablas tienen `org_id` (doctors, services, appointments, patients relacionados contextualmente, holidays, etc.)
- RLS filtra por `org_id` del usuario autenticado
- Rutas por slug: `app/[clinicSlug]/`

Migraciones: `20260102000001_multi_tenant_org.sql`, `20260102000002_update_rpcs_for_org.sql`, `20260102000003_rls_by_org.sql`.

### 5. Disponibilidad & Slots
- Cálculo en PostgreSQL vía funciones/RPC (ver DECISIONES.md #2)
- `get_available_slots(p_doctor, p_date, p_duration)` genera slots según availability_rules, excluye holidays, time_off, citas solapadas, respeta min_notice_hours, max_days_ahead
- Validación de solapamiento con operador `&&` (tstzrange)

Ubicaciones: `app/api/slots/`, función SQL en migración 20260101000001 (y versiones actualizadas).

## Flujo de datos

### Flujo público: Reservar cita

1. Cliente visita `/reservar` (o `/[clinicSlug]/reservar`)
2. Selecciona servicio → profesional → día → hora. UI consulta `GET /api/slots?doctorId=...&date=YYYY-MM-DD&duration=...`
3. `GET /api/slots` llama función SQL `get_available_slots` (o equivalente) filtrando por reglas + exclusiones
4. Ingresa datos paciente (nombre, RUT, teléfono, email) + consentimiento
5. Envía `POST /api/bookings` con datos + Turnstile (si configurado)
6. Servidor valida con Zod (`lib/validation.ts`), verifica disponibilidad (nueva consulta), crea paciente si necesario/reutiliza (según lógica), crea appointment con `status='pending'`, genera manage token, guarda hash
7. Envía email (si Resend configurado) con enlace a gestión
8. Retorna datos de cita + manage URL

### Flujo dashboard: Gestionar citas

1. Login via `POST /api/auth/login` (RUT+password) → Supabase Auth
2. Middleware/proxy verifica sesión (`proxy.ts` como cortina; autorización real en RLS/layouts)
3. Panel consulta `GET /api/dashboard/appointments?date=YYYY-MM-DD` (con filtros opcionales)
4. Endpoints dashboard usan cliente Supabase server-side con cookies
5. Cambios de estado via PATCH/POST a endpoints dashboard (appointments, etc.)
6. Realtime: suscripciones a tabla `appointments`/`notifications` filtradas por org/rol

### Ficha clínica: Acceso a datos clínicos

1. Requiere usuario autenticado con rol autorizado (profesional/admin con permisos)
2. Endpoints bajo `/api/ficha/*` validan sesión + org + rol vía RLS + lógica
3. Operaciones CRUD con auditoría (audit_events) cuando corresponde
4. Export PDF genera documento vía pdfkit con datos agregados

## Conexión entre módulos

- **Booking ↔ Dashboard**: Comparten modelo de `appointments` (mismo schema). Dashboard gestiona estados creados por booking público.
- **Booking ↔ Pacientes**: Al reservar, se crea/identifica paciente por email/RUT (lógica de reutilización presente en migraciones: `20260101000007_patient_reuse.sql`).
- **Multi-tenant atraviesa todo**: Todas las entidades principales tienen `org_id`. Consultas siempre acotadas por org.
- **Ficha ↔ Pacientes/Appointments**: Vincula ficha con paciente existente. Encuentros pueden relacionarse con citas.
- **Slots ↔ Disponibilidad**: Slots calculados dinámicamente desde reglas + exclusiones (no tabla precalculada).

## Clientes Supabase

- `lib/supabase/server.ts` - Cliente SSR con cookies (para API routes/pages server). Usa `@supabase/ssr`.
- `lib/supabase/browser.ts` - Cliente browser para componentes cliente.
- `lib/supabase/admin.ts` - Service role client (omite RLS). **SOLO USAR EN SERVIDOR**. Nunca exponer a cliente.

## Seguridad transversal

- **RLS**: Definido en migraciones `20260101000004_rls.sql`, `20260102000003_rls_by_org.sql`, `20260102000008_ficha_rls_roles_triggers.sql` y ajustes posteriores. RLS es autoridad.
- **Validación**: Zod en env (`lib/env.ts`), validación en endpoints (`lib/validation.ts`), validación server-side.
- **Tokens gestión**: Hash-only. Verificación compara `sha256(token)` con `manage_token_hash`.
- **Rate limiting**: `lib/ratelimit.ts` - Upstash si configurado, else in-memory Map.
- **Turnstile**: `lib/turnstile.ts` - verificación servidor si claves presentes.
- **Proxy**: `proxy.ts` en raíz - comprobación optimista de sesión para rutas dashboard (no reemplaza RLS).

## Zona horaria

Sistema opera en **`America/Santiago`**. Días representados como `YYYY-MM-DD` (string) para evitar ambigüedad zona horaria. Conversión a instantes ocurre al momento de crear slots/rangos con `tstzrange`. Ver DECISIONS.md #1.

**POR CONFIRMAR**: Si existe lógica para manejar cambio horario Chile (DST) - migraciones muestran uso de `at time zone cfg.timezone` y lógica basada en America/Santiago. No se detecta hardcodeo explícito de fechas DST en código revisado, pero se recomienda verificar comportamiento en fechas límite.