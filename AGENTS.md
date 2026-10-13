# AGENTS.md

## ¿Qué hace el proyecto?

Agenda Online es un sistema de reservas de citas para clínicas. Permite a los pacientes reservar horas desde un sitio público (elegiendo servicio, profesional, día y hora), con validación que nunca ofrece horas ya tomadas. Las citas nacen en estado "por confirmar" y el equipo las gestiona desde un panel privado. 

El sistema incluye:
- Sitio público: `/` (portada), `/reservar` (asistente de reserva), `/cita/[token]` (gestión de cita con token), `/privacidad` y `/terminos`.
- Panel profesional: `/dashboard` con login, agenda del día, cambio de estados, notificaciones y suscripción en tiempo real vía Supabase Realtime.
- Módulo de ficha clínica ("Ficha Médica Electrónica"): gestión de pacientes, antecedentes, encuestas, tratamientos, periodoncia, prescripciones, consentimiento, archivos adjuntos, exportación PDF y registro de auditoría (solo para profesionales autorizados).
- Multi-tenant: organizaciones separadas con su propia configuración.
- Sistema de autenticación con RUT y contraseña, roles (admin, profesional, recepción) y RLS a nivel de base de datos.

## Tecnologías y versiones

- **Next.js**: 16.3.8 (App Router). NOTA: Esta versión tiene cambios respecto a versiones anteriores - revisar `node_modules/next/dist/docs/` si se necesita ajustar código.
- **React**: 19.2.8
- **TypeScript**: ^5
- **Node.js**: >= 20 (requisito según README)
- **Base de datos**: PostgreSQL (Supabase). Extensiones: `btree_gist`, `pgcrypto`.
- **Supabase**: 
  - `@supabase/supabase-js`: ^2.117.2
  - `@supabase/ssr`: ^0.12.7
- **Estilos**: Tailwind CSS v4
- **Validación**: Zod ^4.6.5
- **Fechas**: date-fns ^4.4.0, date-fns-tz ^3.2.0
- **Correo**: Resend ^6.31.0 (opcional)
- **Rate limiting**: @upstash/ratelimit ^2.2.0 + @upstash/redis ^1.39.0 (opcional, usa Map en memoria si no configurado)
- **Captcha**: Cloudflare Turnstile (opcional)
- **PDF**: pdfkit ^0.20.2
- **Testing**: Vitest ^3.2.7 (unitarias), Playwright ^1.63.0 (E2E)
- **Linting**: ESLint ^9 con eslint-config-next 16.3.8

## Estructura de carpetas

```
app/                        Rutas Next.js App Router
  (landing)/                Páginas de landing
  (site)/                   Páginas del sitio público (reservar, etc.)
  [clinicSlug]/             Rutas con slug de clínica (multi-tenant)
  api/                      API routes (REST)
    auth/                   login, logout
    bookings/               Crear/gestionar reservas públicas
    slots/                  Obtener slots disponibles
    dashboard/              Endpoints del panel (appointments, availability, doctors, services, holidays, time-off)
    ficha/                  API para ficha clínica (patients, encounters, prescriptions, etc.)
    manage/                 Lookup y gestión
    platform/               Administración de organizaciones
    cron/                   Tareas cron (reminders)
    demo/                   Endpoints de demo
  cita/[token]/             Gestión pública de cita
  dashboard/                Panel profesional (login, layout, rutas protegidas)
lib/                        Lógica compartida y utilidades
  supabase/                 Clientes server/browser/admin
  email/                    Envío y plantillas de email
  ficha/                    Esquemas, tipos y lógica de ficha clínica
  auth.ts, booking.ts, ...  Módulos diversos
components/                 Componentes React reutilizables
  ui.tsx                    Componentes base
  booking/                  Componentes del flujo de reserva
  landing/                  Componentes del landing
  dashboard/                Componentes del panel (dashboard privado)
supabase/
  migrations/               Migraciones SQL (schema, RLS, RPCs, multi-tenant, ficha)
  tests/                    Tests SQL
tests/                      Tests unitarios Vitest
e2e/                        Tests E2E Playwright
scripts/                    Scripts utilitarios (seed, demo, panel-check)
public/                     Assets estáticos
docs/                       Documentación (este directorio)
```

## Convenciones de código

- TypeScript estricto. Usar tipos explícitos donde corresponda.
- Usar rutas relativas/aliases según estructura Next.js. Componentes cliente marcan `"use client"` cuando necesario.
- Zod para validación de entrada (env, formularios, API).
- Zona horaria única: `America/Santiago`. Los días se representan como strings `YYYY-MM-DD` (clave de texto) para evitar errores de zona horaria (ver DECISIONES.md).
- Seguridad: Nunca introducir código que loguee secretos o claves. Nunca commitear secretos. Usar `server-only` donde corresponda.
- RLS es la autoridad: Las políticas de Row Level Security en PostgreSQL son la protección real; el proxy/layouts son verificaciones optimistas.
- Nunca asumir librerías disponibles - verificar en package.json o código existente.
- Estilo: Sin comentarios a menos que sean estrictamente necesarios. Seguir patrones de código existentes en el repositorio.
- Mimic código existente, seguir convenciones del proyecto.
- Encoding UTF-8 respetado.

## Comandos para correr, probar y migrar

| Comando | Descripción |
|---|---|
| `npm install` | Instalar dependencias |
| `npm run dev` | Servidor de desarrollo (http://localhost:3000) |
| `npm run build` | Build de producción |
| `npm run start` | Ejecutar en modo producción |
| `npm run lint` | Ejecutar ESLint |
| `npm run typecheck` | Verificación TypeScript sin emitir |
| `npm run test` | Pruebas unitarias con Vitest |
| `npm run test:watch` | Vitest en modo watch |
| `npm run test:coverage` | Tests con coverage |
| `npm run e2e` | Pruebas E2E con Playwright |
| `npm run check` | lint + typecheck + test |
| `npm run check:panel` | Verificación HTTP/RLS |
| `npm run seed:dev` | Cargar datos de desarrollo |
| `npm run db:test` | `supabase db reset --db-only` |

### Migraciones (Supabase)

Las migraciones SQL viven en `supabase/migrations/` con nombres ordenados cronológicamente (YYYYMMDDHHMMSS_descripción.sql). Son la fuente de verdad del esquema.

## Reglas importantes

### Qué NO tocar
- No modificar código existente (instrucción explícita para esta tarea). Solo crear archivos de documentación.
- No commitear cambios a menos que el usuario lo pida explícitamente.
- No añadir comentarios al código salvo solicitud explícita.
- No introducir secretos (claves, passwords, tokens reales) en ningún archivo creado.
- No inventar información: Solo escribir lo verificable en código. Si algo no está claro, marcar como `POR CONFIRMAR`.
- No eliminar o alterar migraciones existentes.

### Cómo manejar errores y permisos
- **RLS (Row Level Security)**: Capa de autorización real en PostgreSQL. No asumir permisos solo desde aplicación.
- **Autenticación**: Login con RUT + contraseña (Supabase Auth). Sesiones vía cookies/SSR.
- **Tokens de gestión**: Citas públicas usan `manage_token_hash` (SHA-256 hex) del token en claro; el token nunca se guarda.
- **Validación estricta**: Usar Zod en env y endpoints. Validar en servidor (autoridad).
- **Errores**: Devolver HTTP apropiados. Config de entorno falla en arranque (fail-fast).
- **Rate limiting**: Upstash cuando disponible, fallback a Map in-memory en desarrollo.
- **Turnstile**: Opcional - si no configurado, se omite (solo aceptable en desarrollo/local).
- **Zona horaria**: `America/Santiago`. Días como `YYYY-MM-DD`.
- **Multi-tenant**: Todas las entidades principales tienen `org_id`. RLS filtra por organización.

## Estado actual

- Proyecto funcional con flujo público + panel privado + ficha clínica + multi-tenant.
- Migraciones completas en `supabase/migrations/`.
- Tests unitarios (Vitest) y E2E (Playwright) presentes.
- Scripts de utilidad y seed de desarrollo disponibles.
- Configuración de entorno validada con Zod.

**POR CONFIRMAR**: Estado de despliegue/ambiente productivo (URLs, dominios reales) - no verificables en código.