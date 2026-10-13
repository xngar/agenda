# PENDIENTES.md

## Estado: Lo terminado (verificable desde código)

### Core del sistema
- [x] Estructura Next.js 16 App Router con rutas públicas, dashboard, API routes
- [x] Flujo público de reserva (wizard: servicio → profesional → día/hora → datos)
- [x] Creación de citas con estado `pending` ("por confirmar")
- [x] Gestión de citas por token (`/cita/[token]`) con hash-only de token
- [x] Dashboard profesional con auth RUT+password, roles (admin/profesional/reception)
- [x] Cambio de estados de cita (pending/confirmed/cancelled/completed/no_show, reopen)
- [x] Cálculo de disponibilidad en PostgreSQL (RPCs + validación)
- [x] Prevención doble reserva (constraint GIST + revalidación)
- [x] Multi-tenant con `org_id` y RLS
- [x] Ficha clínica (EHR): pacientes, encuentros, antecedentes, plan, recetas, periodoncia, odontograma, consentimientos, adjuntos, PDF, auditoría
- [x] Encuentros firmados inmutables + versiones de corrección
- [x] Sistema de auditoría con eventos `sign` explícitos
- [x] Validación con Zod (env + APIs + formularios)
- [x] Rate limiting (Upstash + fallback in-memory)
- [x] Turnstile opcional con fallback seguro
- [x] Emails con Resend + plantillas (fallback a console)
- [x] ICS generación sin VTIMESZONE (UTC Z)
- [x] Fechas como claves YYYY-MM-DD, zona America/Santiago
- [x] RLS estricto por org/rol
- [x] Clientes Supabase separados (server/browser/admin)

### Migraciones y datos
- [x] Migraciones completas schema + RLS + RPCs + ficha + multi-tenant
- [x] Tests SQL de disponibilidad (`supabase/tests/availability.sql`)
- [x] Seed desarrollo (`scripts/seed-dev.ts`)

### Testing y tooling
- [x] Vitest unit tests presentes
- [x] Playwright E2E tests presentes
- [x] Scripts utilitarios (panel-check, demo-panel, shots)
- [x] TypeScript estricto, ESLint configurado
- [x] Config validada con Zod

## Lo incompleto / parcialmente implementado

### Funcionalidades con ambigüedad
- [~] **Recepción**: Migraciones añaden soporte recepción (20261008000001, 20260107000020) y código chequea `role==='reception'`. Alcance exacto de permisos (solo agenda vs ver pacientes) **POR CONFIRMAR** - políticas RLS detalladas requieren revisión completa.
- [~] **Super admin plataforma**: Endpoints `/api/platform/*` existen. UI/dashboard plataforma (`app/dashboard/(platform)/`) presente. Cobertura completa (gestión completa orgs/usuarios) **POR CONFIRMAR**.
- [~] **Ficha clínica - permisos**: `isClinical()` incluye admin; algunas rutas exigen clinical. Diferenciación recepción vs profesional vs admin en ficha **POR CONFIRMAR**.
- [~] **Storage adjuntos**: Metadatos en `attachments`, endpoint `attachments/[id]/url`. Políticas bucket Supabase Storage `ficha-adjuntos` **NO verificadas** en migraciones SQL revisadas. **POR CONFIRMAR**.
- [~] **Recordatorios cron**: Endpoint `/api/cron/reminders` existe con auth CRON_SECRET. Lógica de cuándo/envío (ventana 24h antes, etc.) **PARCIALMENTE visible** - revisar implementación completa si necesario.
- [~] **Reprogramación pública**: Ruta manage soporta reprogramar. Validaciones (anti-pasado, disponibilidad) **POR CONFIRMAR** alcance completo.
- [~] **Notificaciones dashboard**: Tabla `notifications` + tipos definidos. Creación/consumo en UI **POR CONFIRMAR**.

### UI/UX (no código backend crítico)
- [~] Algunos componentes dashboard/ficha - funcionalidad vs completitud estética **POR CONFIRMAR**.
- [~] Flujo multi-tenant por slug: rutas `app/[clinicSlug]/*` existen. Resolución org consistente **POR CONFIRMAR** en todos endpoints públicos.

## Lo que falta (no evidente en código revisado)

### Infra/operación
- [ ] **Variables prod**: Definición completa `.env` producción (dominios, SMTP real). `.env.example` completo pero valores reales **POR CONFIRMAR**.
- [ ] **CSP/Headers seguridad**: Next.js headers/security headers (HSTS, CSP, X-Frame-Options) **NO visibles** en `next.config.ts` revisado. **POR CONFIRMAR**.
- [ ] **Rate limiting producción**: Upstash configurado? Fallback in-memory no sirve multi-réplica. Requiere configuración externa.
- [ ] **Backups/retención**: Estrategia backups BD Supabase **POR CONFIRMAR** (fuera código).
- [ ] **Monitoreo/logging**: Logs de errores, alertas **POR CONFIRMAR**.

### Features potenciales (no detectados)
- [ ] **Export ficha completo**: Endpoint export existe; formato/alcance completo **POR CONFIRMAR**.
- [ ] **Búsqueda global pacientes**: Ficha soporta búsqueda; dashboard búsqueda citas **POR CONFIRMAR**.
- [ ] **Integración pago**: No se detecta (no hay referencias). **CONFIRMADO** ausente.
- [ ] **WhatsApp/SMS**: Solo email (Resend). **CONFIRMADO** ausente.
- [ ] **API pública para terceros**: No se detecta. **CONFIRMADO** ausente.

### Testing gaps
- [ ] **E2E cobertura completa**: Tests E2E presentes (`e2e/booking.spec.ts`), alcance a ficha/dashboard **POR CONFIRMAR**.
- [ ] **Tests integración API**: Mayoría unitarios + SQL tests. Faltan tests API routes **POR CONFIRMAR**.

## Recomendaciones antes de producción

1. **Verificar políticas Storage** bucket `ficha-adjuntos` (RLS + upload constraints)
2. **Revisar permisos recepción** vs requisitos reales (políticas RLS)
3. **Configurar Upstash Redis** si múltiples réplicas
4. **Añadir security headers** en Next.js (CSP, HSTS)
5. **Rotar MANAGE_TOKEN_KEY** por entorno
6. **Verificar seeds** no vayan a prod
7. **Revisar logs** para evitar PII
8. **Probar flujo completo** con datos reales

## Notas

- Todo lo marcado "POR CONFIRMAR" indica información no verificable directamente en código fuente analizado. No se ha inventado.
- Estado "terminado" significa implementado según código (puede requerir pruebas funcionales).
- Documentación creada refleja estado real del código al momento del análisis.