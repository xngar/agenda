# API.md

## Notas generales

- Rutas bajo `app/api/` (Next.js App Router, route handlers). Runtime Node.js.
- Autenticación: sesión Supabase Auth vía cookies (SSR). 
- Autorización: lógica por rol + RLS (Postgres). Endpoints dashboard/ficha validan sesión.
- Validación: Zod en endpoints. Errores devuelven JSON con campo `error` y códigos HTTP apropiados.
- Rate limiting: `checkRateLimit` (Upstash si disponible, Map in-memory fallback). 
- Turnstile: opcional; si no configurado/ok retorna error 422 cuando requerido.
- Zona: América/Santiago (`America/Santiago`).
- Multi-tenant: algunas rutas aceptan `clinicSlug` o usan org del usuario autenticado.

**POR CONFIRMAR**: Detalles de respuestas para algunos endpoints no están completamente visibles en código (listas con paginación, campos exactos de respuesta). Se documenta lo verificable.

## Auth

### POST `/api/auth/login`
Login con RUT + contraseña (Supabase Auth).

**Body (JSON):** (según `lib/validation.ts` loginSchema)
- `email` (string, required) - email del doctor
- `password` (string, required, min 8)

**Respuestas:**
- `200 OK` - `{ ok: true }` (redirección a dashboard ocurre desde cliente/SSR según flujo)
- `400` - solicitud inválida
- `401` - credenciales inválidas / usuario inactivo
- `500` - error inesperado

**Notas:** Usa Supabase Auth signInWithPassword. `getDoctorSession()` valida doctor activo en tabla `doctors`.

### POST `/api/auth/logout`
Logout sesión.

**Respuestas:**
- `200 OK` - `{ ok: true }` (o redirección a login)

**Ubicación:** `app/api/auth/logout/route.ts`

## Bookings (público)

### POST `/api/bookings`
Crear reserva pública (pasa por wizard). Crea cita con estado `pending`.

**Body (JSON, según validación):** campos de `patientDetailsSchema` + `serviceId`, `doctorId` (nullable), `slotStart` (ISO con offset), `turnstileToken` (opcional), `clinicSlug` (opcional).

Campos mínimos: `fullName`, `rut`, `phone`, `email`, `serviceId`, `doctorId` nullable, `slotStart`, `consent: true`.

**Rate limit:** booking (5 requests/hora por identidad).

**Validaciones:**
- Turnstile (si configurado) - 422 si falla
- Disponibilidad revalidada (orquesta `bookAppointment` en `lib/booking.ts`)
- Crea/reutiliza paciente, crea appointment con `manage_token_hash`, estado `pending`

**Respuestas:**
- `200 OK` - `{ manageUrl: string, appointmentId: string }`
- `400` - datos inválidos / JSON mal formado
- `422` - validación fallida (Zod) o Turnstile falla (con mensaje)
- `429` - rate limit
- `409/500` - errores de negocio (ej. "hora ya tomada") mapeados vía `BusinessError` → códigos apropiados

**Ubicación:** `app/api/bookings/route.ts`

## Slots (público)

### GET `/api/slots`
Obtiene slots disponibles para un día/servicio/profesional.

**Query params:**
- `clinicSlug` (opcional, string)
- `date` (required, `YYYY-MM-DD`) - día
- `serviceId` (required, UUID)
- `doctorId` (opcional/puede ser vacío) - UUID o vacío/"any"/"null" → tratado como sin filtro por doctor específico

**Validaciones:** Zod + `isValidDayKey`. Rate limit 120 req/min.

**Lógica:**
- Obtiene servicio, catálogo/org, valida rango (today + max_days_ahead en zona org). Si fuera de rango → `{ slots: [], outOfRange: true }`
- Si feriado o weekday === 0 (domingo) → `{ slots: [], closed: true }`
- Calcula slots vía lógica de disponibilidad (consulta/función relacionada con `get_available_slots` y reglas). Retorna `slots: SlotWithDoctor[]` o array vacío con flags.

**Respuestas:**
- `200 OK` - `{ slots: [...] , closed?, outOfRange? }`
- `400` - params inválidos
- `404` - servicio no disponible
- `429` - rate limit

**Ubicación:** `app/api/slots/route.ts`

## Dashboard - Appointments

### GET `/api/dashboard/appointments`
Lista citas del dashboard para fecha dada (con filtros).

**Query params (según uso):**
- `date` (string, `YYYY-MM-DD`) - día requerido
- `doctorId` (opcional) - filtrar por doctor
- **POR CONFIRMAR**: otros filtros (status, etc.) no visibles explícitos

**Auth:** requiere `getDoctorSession()` (401 si no). Autorización: admin ve todo equipo (según rol), profesional ve propias, recepción según permisos (migración 20260107000020).

**Respuesta:** lista de citas con datos relacionados (patient, doctor, service) según `APPOINTMENT_SELECT`.

**Respuestas:** 200 OK con array, 401, 500.

**Ubicación:** `app/api/dashboard/appointments/route.ts` (GET/POST/PUT/PATCH según archivo; revisado POST para update state)

### POST `/api/dashboard/appointments`
Cambiar estado de cita.

**Body (JSON):**
- `appointmentId` (UUID, required)
- `action` (enum: `confirmed|cancelled|completed|no_show|reopen`, required)
- `reason` (string, max 500, opcional)

**Validaciones:** Zod. Auth + autorización: permite si doctor_id coincide o session.isAdmin o role==='reception' (revalida explícitamente).

**Acciones:** mapea `action` a cambio de `status`. `reopen` → pasa a `confirmed` y limpia campos cancelación.

**Respuestas:** 200 OK `{ ok: true, appointment: {...} }`, 400 inválido, 401, 403 (no autorizado), 404 no encontrada, 500 con `BusinessError` mapeado.

**Ubicación:** `app/api/dashboard/appointments/route.ts`

## Dashboard - Availability

### GET/POST/PUT/PATCH/DELETE `/api/dashboard/availability`
Gestión de reglas de disponibilidad (`availability_rules`) por doctor/org.

**Auth:** requiere sesión. Solo propietario o admin (política/validación). **POR CONFIRMAR**: estructura exacta de body por método (GET lista reglas, POST crea, etc.) - no completamente visible en fragmento.

**Ubicación:** `app/api/dashboard/availability/route.ts`

## Dashboard - Doctors

### GET/PATCH/POST `/api/dashboard/doctors`
Gestión de doctores. Requiere admin para acciones de activar/desactivar/crear (PATCH activa/desactiva requiere `session.isAdmin`).

**PATCH body:** `{ doctorId: UUID, active: boolean }` (según fragmento). Respuestas 401/403/400/500.

**Ubicación:** `app/api/dashboard/doctors/route.ts`

## Dashboard - Services, Holidays, Time-off

Rutas CRUD bajo `/api/dashboard/services`, `/api/dashboard/holidays`, `/api/dashboard/time-off`. Requieren auth; acciones admin para catálogos según RLS. **POR CONFIRMAR**: contratos exactos.

## Cron

### POST `/api/cron/reminders`
Tarea cron para recordatorios.

**Auth:** requiere header/secret `CRON_SECRET` (401 si falta/no coincide).

**Lógica:** envía recordatorios según lógica (revisa `reminder_sent_at`, rango horario). Procesa citas pendientes/confirmadas con recordatorios.

**Respuesta:** 200 OK con resumen (procesados/enviados), 401 no autorizado.

**Ubicación:** `app/api/cron/reminders/route.ts`

## Demo

### POST/GET `/api/demo`
Endpoints demo. **POR CONFIRMAR**: propósito y auth (posiblemente solo dev). `route.ts` corto.

## Ficha clínica (EHR)

Todas requieren sesión válida (`fichaContext()` → 401). Requieren acceso clínico (`isClinical`) para operaciones clínicas (403 si no). Siempre acotadas por `org_id` y RLS.

### GET `/api/ficha/patients`
Listar pacientes.

**Query params:**
- `q` (string, opcional) - búsqueda full_name/rut/email
- `status` (string, opcional) - `active|inactive|abandoned` (validado)
- `limit` (number, opcional, default 50, min 1, max 200)
- `offset` (number, opcional, default 0)

**Comportamiento:** si `clinical` → consulta directa tabla `patients` filtrada por org + q + status + paginación (range). Si no clínico → usa RPC `list_patients_contact` con params `p_q,p_status,p_limit,p_offset,p_sort,p_dir`. Retorna `{ patients, count, limit, offset }`.

**Respuestas:** 200, 401, 500 (dbError).

### POST `/api/ficha/patients`
Crear paciente.

**Body:** según `patientBaseSchema` (ficha). Valida, crea con `org_id` desde ctx.

**Respuestas:** 200/201 con paciente creado, 401, 403, 422 (bodyError), 409 (duplicado), 500.

### GET `/api/ficha/patients/[id]`
Obtener paciente + datos relacionados. Requiere pertenencia a org (`orgPatient`).

### PATCH/PUT/DELETE `/api/ficha/patients/[id]`
Actualizar/eliminar paciente (según permisos clínicos + RLS).

### Subrutas paciente
- `GET/POST /api/ficha/patients/[id]/encounters` - encuentros
- `GET/POST /api/ficha/patients/[id]/background` - antecedentes
- `GET/POST /api/ficha/patients/[id]/plan` - plan tratamiento
- `GET/POST /api/ficha/patients/[id]/prescriptions` - recetas
- `GET/POST /api/ficha/patients/[id]/periodontal` - periodontograma
- `GET/POST /api/ficha/patients/[id]/consents` - consentimientos
- `GET/POST /api/ficha/patients/[id]/attachments` - adjuntos
- `GET /api/ficha/patients/[id]/chart` - odontograma
- `GET /api/ficha/patients/[id]/export` - exportar
- `GET /api/ficha/patients/[id]/pdf` - generar PDF

**Notas ficha:** muchas operaciones usan helpers `fichaContext`, `orgPatient`, `bodyError`, `dbError`, `forbidden`, `notFound`, `invalid`, `conflictMessage`. Encuentros firmados (`status='signed'`) son inmutables (RLS + trigger).

### Encuentros
- `GET/PATCH /api/ficha/encounters/[id]`
- `GET/POST /api/ficha/encounters/[id]/versions` - versiones correcciones

### Catálogo
- `GET/POST /api/ficha/catalog`
- `GET/PATCH/DELETE /api/ficha/catalog/[id]`

### Plan
- `PATCH /api/ficha/plan/[id]`

### Attachments
- `GET /api/ficha/attachments/[id]/url` - URL para adjunto
- `DELETE /api/ficha/attachments/[id]` - eliminar adjunto (admin o médico dueño del paciente); borra el objeto del bucket y la fila queda auditada

### Audit
- `GET /api/ficha/audit` - logs auditoría (lectura restringida según permisos; tabla `audit_log` con acciones insert/update/delete/sign/export/view)

## Manage (gestión pública de citas)

### GET/POST `/api/manage`
Lookup/gestión de cita por token de gestión.

**Auth:** no requiere sesión (público). Usa `manage_token_hash` (SHA-256). Valida token shape + hash.

**Operaciones:** confirmar/cancelar/reprogramar cita vía token (acciones públicas del paciente). **POR CONFIRMAR**: contrato exacto (params/body, respuestas).

**Ubicación:** `app/api/manage/route.ts`, `app/api/manage/lookup/route.ts`

## Platform (admin plataforma)

### GET/POST/PATCH/DELETE `/api/platform/organizations`
Gestión de organizaciones (super admin). Requiere `requireSuperAdmin()`.

**Rutas:** `/api/platform/organizations`, `/api/platform/organizations/reset-password`, etc. **POR CONFIRMAR**: contratos detallados (muchos campos). Usa `supabaseAdmin` en ocasiones.

**Ubicación:** `app/api/platform/organizations/...`

## Códigos HTTP comunes (observados)

- 200 OK, 201 Created (implícito), 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity (validación Zod/negocio), 429 Too Many Requests, 500 Internal Server Error.

**Notas:** Errores de negocio mapeados con `BusinessError` (`lib/errors.ts`) → status apropiado. `dbError` mapea códigos Postgres (23505 duplicado, EFIRM ficha firmada).

**POR CONFIRMAR**: Algunos endpoints retornan formatos ligeramente distintos; lo documentado es verificable desde código.