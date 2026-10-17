# SEGURIDAD.md

## Principios de seguridad

1. **RLS es la autoridad**: Row Level Security en PostgreSQL es la capa de protección real. Lógica de app es optimista, no autoritativa.
2. **Fail-fast en configuración**: Variables de entorno se validan con Zod en `lib/env.ts` al arranque (throw si inválidas).
3. **Nunca exponer secretos**: Service role solo en servidor (`lib/supabase/admin.ts` marcado server-only). Tokens nunca se loguean. Código evita console.log con secretos.
4. **Validación server-side**: Todos los inputs críticos validados con Zod en API routes. Cliente valida UX, servidor autoriza.
5. **Principio mínimo privilegio**: RLS restringe por org_id, rol, propiedad (doctor_id). Grants explícitos en migraciones.
6. **Timing-safe**: Comparación de hashes con `timingSafeEqual` (`lib/token.ts`).

## Autenticación

- **Proveedor**: Supabase Auth (email/password). Login vía RUT+password (email del doctor usado como credencial).
- **Sesión**: Cookies HTTP (SSR con `@supabase/ssr` en `lib/supabase/server.ts`). Validación server-side en cada request.
- **Verificación de sesión**: `getDoctorSession()` lee usuario Auth + valida existencia/activo en tabla `doctors`. Rechaza si `active=false`.
- **Proxy optimista**: `proxy.ts` (raíz) revisa cookie para redirecciones rápidas en dashboard; **NO reemplaza** validación real (RLS/layouts siguen aplicando). Ver DECISIONS.md #4.

## Autorización y roles

### Roles de doctores (`doctors`)
- `is_admin` (boolean): administrador de clínica - gestiona catálogos (doctores, servicios, feriados), ve equipo según contexto.
- `is_super_admin` (boolean): administrador de plataforma - gestiona organizaciones (`requireSuperAdmin()`).
- `role` (text): según ficha - valores usados `'professional'`, `'reception'`, `'admin'` (mapeo en código). 
  - `professional`: acceso clínico (ficha). 
  - `reception`: acceso a agenda/contacto, no clínico completo.
  - `admin`: tratamiento especial en helpers ficha (`staff_role()` incluye 'admin' como clínico en algunos casos).

Helpers:
- `getDoctorSession()` retorna `DoctorSession` con `isAdmin`, `isSuperAdmin`, `role`, `orgId`, `orgSlug`, `orgType`.
- `isClinical(session)`: true si superadmin OR role==='professional' OR isAdmin (según `lib/auth.ts`).
- `fichaContext().clinical`: deriva de `isClinical(session)`. Muchos endpoints ficha exigen clinical.

### Control por organización (multi-tenant)
- Todas entidades principales tienen `org_id`. 
- RLS filtra `using (org_id = auth_org_id())` y `with check (org_id = auth_org_id())` (helpers `auth_org_id()` definidos en migraciones). 
- Consultas SIEMPRE acotadas por org del usuario.

### RLS (capas)
Migraciones aplican RLS por tablas:
- Público (anon/authenticated): lectura mínima catálogo (settings, holidays, active doctors con campos limitados, active services). No expone info sensible.
- Autenticado (doctors): ve propio perfil, reglas/ausencias propias o admin, appointments propios (con excepciones admin/reception según políticas/migraciones), notifications propias, patients vinculados históricamente (políticas ajustadas en ficha a org-based).
- Admin clínico: manage doctors/services/holidays/settings (según políticas 0004 y posteriores).
- Ficha: políticas específicas (draft vs signed encounters, versiones solo lectura/alta, audit lectura restringida). Ver migraciones 20260102000008_ficha_rls_roles_triggers.sql.

**Importante:** RLS puede devolver 0 filas o 403 implícito; endpoints revalidan autorización explícita para mensajes claros.

## Tokens de gestión (citas públicas)

- **Generación**: `generateManageToken()` → 32 bytes aleatorios hex (64 chars). Entropía alta.
- **Almacenamiento**: **Nunca** se guarda token en claro. Solo `manage_token_hash = sha256(token)` (hex). Columna única.
- **Verificación**: compara hash SHA-256 + `safeCompareHash()` con `timingSafeEqual()` (previene timing attacks). Valida shape hex 64.
- **Cifrado backup**: migración 0003 añade copia cifrada con `pgp_sym_encrypt` (requiere `MANAGE_TOKEN_KEY`) para poder reenviar enlace 24h antes. Solo servidor puede descifrar. Rotar `MANAGE_TOKEN_KEY` invalida copias cifradas (documentado en .env.example).
- **Uso**: endpoints `/api/manage/*` validan token vía hash. URLs públicas: `/cita/[token]`.

## Validación y protección de inputs

- **Zod schemas**: `lib/validation.ts` + schemas ficha (`lib/ficha/schemas.ts`). Mensajes en español.
- **RUT**: validación/verificación dígito verificador (`lib/rut.ts`). Normalización quita puntos/guiones/espacios. Verifica checksum.
- **Fechas**: validación day keys `YYYY-MM-DD` (`isValidDayKey`), month keys. Prevenir abuso de rangos (servidor aplica límites max_days_ahead).
- **UUIDs**: validados donde corresponde.

## Rate limiting

- **Implementación**: `lib/ratelimit.ts`. Usa `@upstash/ratelimit` + Redis si `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` configurados. Sino fallback a `Map` in-memory (válido dev/single instance).
- **Endpoints protegidos**: booking (5/hora), slots (120/min), otros según lógica. Retorna 429 si excede.

## Turnstile (captcha)

- **Cloudflare Turnstile**: opcional. Si claves presentes (`TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`), `verifyTurnstile()` valida token servidor-side (`lib/turnstile.ts`). 
- **Fallback seguro**: si no configurado, verificación se omite (solo aceptable desarrollo/local). Booking retorna 422 si falla verificación.

## Seguridad de datos

- **Datos personales mínimos**: `patients` solo datos para agendar (nombre,RUT,teléfono,email,consent_at). Comentario explícito: no contiene info clínica/salud (Ley 19.628).
- **Ficha clínica**: datos sensibles médicos/dentales. Acceso fuertemente restringido (solo clinical), RLS estricto, auditoría completa.
- **Auditoría**: `audit_log` registra acciones (insert/update/delete/sign/export/view) con actor, org, entidad, resumen JSON. Trigger añade evento `sign` explícito al firmar encuentro (cambia draft→signed). Solo lectura restringida.
- **Consentimientos**: tabla `consents` registra texto aceptado, versión, fecha, quién aceptó.
- **Adjuntos**: metadatos en BD (`attachments`), binario en bucket Supabase Storage `ficha-adjuntos`. URLs firmadas/gestionadas vía endpoint `attachments/[id]/url`. **POR CONFIRMAR**: políticas Storage (RLS a nivel bucket) no visibles en migraciones SQL revisadas - verificar en Supabase dashboard/config.

## Prevención de doble reserva

- **En BD**: constraint `exclude using gist (doctor_id with =, during with &&) where (status in ('pending','confirmed'))` en `appointments` (migración 0001). Impide solapamiento a nivel DB.
- **En lógica**: `bookAppointment` usa función/flujo que revalida disponibilidad (RPC `book_appointment` o lógica transaccional) antes de insertar. Slots se calculan excluyendo citas activas y time-off/holidays.
- **Fuente única verdad**: disponibilidad calculada en Postgres (DECISIONS.md #2).

## Seguridad de endpoints críticos

- **Booking público**: pasa por `book_appointment` (SECURITY DEFINER) según comentario en route - revalida dentro transacción. Rate limit + Turnstile.
- **Cambios estado dashboard**: revalidan autorización explícita (doctor propietario OR admin OR reception). Nunca confían en IDs cliente.
- **Gestión por token**: hash-only, timing-safe. Sin sesión.
- **Ficha firmada**: inmutable - RLS bloquea UPDATE sobre status!='draft', trigger puede bloquear/gestionar versiones. Creación de `encounter_versions` para correcciones (histórico inmutable).
- **Eliminación encounters borradores**: solo doctor autor o admin.

## Exposición de datos al cliente (bundle del navegador)

- Los componentes marcados `"use client"` envían a serializarse al bundle del navegador lo que reciben por props y lo que usan. Mantener esto en mind al mover un componente de servidor a cliente.
- **`SiteHeader` (`components/site-header.tsx`) es cliente** (para el menú hamburguesa móvil). Recibe `brand: ClinicBrand`, que solo contiene datos públicos de contacto (`name`, `slug`, `address`, `phone`, `supportEmail`) ya renderizados en el footer. No incluye secretos ni claves; el org se resuelve en servidor (`getPublicOrganization`/`getDefaultOrganization`) y solo se pasa el subconjunto público.
- No pasar nunca objetos de sesión, cookies, filas de BD completas ni nada marcado `server-only` a un componente cliente. Las variables secretas (`SUPABASE_SERVICE_ROLE_KEY`, `MANAGE_TOKEN_KEY`, etc.) solo existen en servidor por validación Zod (`lib/env.ts`) y no deben referenciarse desde cliente.

## Headers, CORS, runtime

- Next.js App Router route handlers. `runtime = "nodejs"` en algunos endpoints (bookings). Usa server-only imports.
- No exposición de claves al cliente (solo `NEXT_PUBLIC_*` permitidas: URL, anon key, Turnstile site key).

## Configuración segura por entorno

Variables críticas (server-only): `SUPABASE_SERVICE_ROLE_KEY`, `MANAGE_TOKEN_KEY`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `CRON_SECRET`, `UPSTASH_*`. 
- Mínimos largos (Zod min). 
- `MANAGE_TOKEN_KEY` rotación documentada (invalida copias cifradas).
- `CRON_SECRET` protege endpoint cron.

## Recomendaciones / hallazgos

- **RLS + revalidación explícita**: buena práctica (defensa en profundidad). Varios endpoints revalidan auth aunque RLS protege.
- **Tokens hash-only**: correcto, evita fuga si BD comprometida (hash SHA-256). Copia cifrada backup es aceptable con clave fuerte.
- **Fail-fast env**: evita errores silenciosos en producción.
- **Exclusión GIST**: previene race conditions de doble reserva a nivel DB.
- **Scope de cliente**: los componentes cliente (p. ej. `SiteHeader`) solo reciben datos ya públicos; no hay secretos en el bundle. Revisar al convertir server→client.
- **No comentarios innecesarios en código** (regla repo) pero migraciones documentadas.

**POR CONFIRMAR**: Políticas Storage bucket `ficha-adjuntos` (lectura/escritura por org/rol), configuración CORS Supabase, CSP/headers HTTP a nivel Next (no visibles en código revisado), logging de errores (posibles PII en logs). También confirmar si `service_role` se usa únicamente donde necesario.