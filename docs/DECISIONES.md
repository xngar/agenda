# DECISIONES.md

Registro de decisiones técnicas tomadas y su motivo, deducidas únicamente del código analizado. Formato ADR simplificado: Contexto, Decisión, Consecuencia.

## 1. El día es una clave de texto ("YYYY-MM-DD"), no una fecha Date

**Contexto.** El servidor puede estar en UTC y el navegador del cliente en zona distinta. Un "día hábil" es concepto de calendario civil (no instante). Operaciones como sumar días o determinar weekday pueden variar según zona si se usan timestamps.

**Decisión.** Representar días como string `YYYY-MM-DD` (clave de texto). Cálculos con UTC para claves (`addDaysToKey`, `weekdayOfKey` usan `Date` con `T00:00:00Z` y operaciones UTC). Conversión a instante ocurre únicamente al elegir hora vía `zonedInstant(day, time, timezone)` usando `fromZonedTime` (date-fns-tz).

**Consecuencia.** Sumar días es determinista entre servidor/cliente. Evita errores de "borde de día" por cambio de zona. Código ligeramente más explícito. Ver `lib/dates.ts`.

## 2. Disponibilidad calculada en PostgreSQL, no en aplicación

**Contexto.** Disponibilidad depende de reglas semanales, feriados, vacaciones/time-off, citas existentes y solapamientos. Calcular en Node requiere sincronizar estado y es propenso a race conditions para doble reserva.

**Decisión.** Lógica de disponibilidad vive en SQL/Postgres (funciones RPC como `get_available_slots`, `dashboard_appointments`, `dashboard_month_appointments`, etc.). Cliente nunca decide si hora está libre; servidor/BD validan.

**Consecuencia.** Fuente única de verdad. Doble reserva bloqueada por constraint DB + validación transaccional. Lógica de agenda distribuida entre app y SQL (debe recordarse al modificar esquema). Ver comentarios en migraciones y uso en `app/api/slots/route.ts`.

## 3. Filtrar citas por solapamiento (&&) con tstzrange, nunca por comparación directa

**Contexto.** `appointments.during` es `tstzrange`. Intentar filtrar "citas de hoy" comparando rango con instantes con operadores `>=`/`<=` entre rango e instante es incorrecto (produce "malformed range literal" en ciertos casos). El solapamiento entre rango de día y rangos de citas requiere operador de solapamiento.

**Decisión.** Usar operador `&&` (overlap) contra `tstzrange` construido con límites del día en zona `America/Santiago` (`at time zone 'America/Santiago'`). Aplicado en `dashboard_appointments`, `dashboard_month_appointments`, `get_available_slots`, etc. (migración 0010 y referencias en DECISIONS.md código).

**Consecuencia.** Consultas correctas y estables. Evita error reportado en diseño. Requiere construir rangos con límites explícitos incluyendo cambio de hora.

## 4. RLS es autoridad; proxy solo cortina

**Contexto.** Proteger rutas dashboard solo en proxy da falsa sensación de seguridad si políticas BD no aplican. También puede haber bypass si se accede directo a APIs.

**Decisión.** `proxy.ts` hace chequeo optimista de cookie (rápido, sin red) para redirecciones UX. Autorización real en RLS + validación server-side (`getDoctorSession()`, layouts server, políticas SQL). Endpoints revalidan explícitamente cuando necesitan mensajes claros.

**Consecuencia.** Defensa en profundidad. Proxy removable sin abrir brecha. Mejor UX (redirect temprano) sin comprometer seguridad.

## 5. ICS sin VTIMESZONE, UTC puro (Z)

**Contexto.** Chile tiene cambios horario (DST). Hardcodear `VTIMEZONE` con transiciones queda desactualizado y puede desplazar citas con el tiempo.

**Decisión.** Emitir instantes ICS como UTC con sufijo `Z` (`DTSTART:YYYYMMDDTHHMMSSZ`). Zona de clínica aparece solo en texto legible de descripción (`lib/ics.ts` según DECISIONS.md). Construcción desde instantes reales.

**Consecuencia.** Eventos correctos independientemente de cambios DST futuros. Más robusto para clientes calendario diversos. Texto descriptivo incluye zona `America/Santiago`.

## 6. Tokens de gestión: hash-only, nunca guardar token en claro

**Contexto.** Enlaces de gestión de cita (`/cita/[token]`) son poderosos (permiten confirmar/cancelar/reprogramar). Si BD comprometida, exponer tokens en claro permitiría actuar sobre citas.

**Decisión.** Almacenar solo `manage_token_hash = sha256(token_hex)` (hex). Token generado aleatorio 32 bytes. Verificación con comparación timing-safe. Backup cifrado opcional con `pgp_sym_encrypt` (requiere `MANAGE_TOKEN_KEY`) para reenvío controlado.

**Consecuencia.** Compromiso BD no revela tokens utilizables inmediatamente (requiere fuerza bruta inviable). Rotación `MANAGE_TOKEN_KEY` invalida copias cifradas (trade-off documentado).

## 7. Exclusión GIST para evitar doble reserva

**Contexto.** Race condition entre dos requests simultáneos creando cita en mismo slot: ambos pueden pasar validación previa antes de insertar.

**Decisión.** Constraint `exclude using gist (doctor_id with =, during with &&) where (status in ('pending','confirmed'))` en `appointments` (migración 0001). Usa índice GiST para detectar solapamiento por rango + igualdad doctor.

**Consecuencia.** Protección a nivel transaccional/DB. Un insert fallará con error DB (23505/conflicto de exclusión) → mapeado a error de negocio "hora ya tomada". Más robusto que validación solo app.

## 8. Disponibilidad vía función SQL + filtros en servidor

**Contexto.** Wizard público consulta slots frecuentemente. Necesario filtrar rango por `max_days_ahead`, feriados, domingo (weekday 0), holidays, time-off, citas activas, min notice hours.

**Decisión.** API `GET /api/slots` valida rango servidor-side (no confía cliente), chequea holiday/domingo, luego obtiene slots (vía lógica basada en `get_available_slots` o equivalente). Flags `closed`, `outOfRange` devueltos explícitamente.

**Consecuencia.** Control estricto de límites de negocio. Previene scraping ampliando rango. UX clara (muestra motivo vacío).

## 9. Validación temprana de RUT con checksum

**Contexto.** Error de RUT puede confundirse con "hora no disponible" si validación es tardía (comentario en `lib/validation.ts`: validar checksum antes de lógica de negocio).

**Decisión.** `rutSchema` usa `.refine(isValidRut, ...)` → valida formato + dígito verificador en capa de validación Zod (entrada). `formatRut` exige verificador correcto.

**Consecuencia.** Errores de validación claros y tempranos. Mejora UX, evita caminos equivocados en negocio.

## 10. Ficha clínica: encuentros firmados inmutables + versiones

**Contexto.** Registros clínicos requieren trazabilidad e inmutabilidad una vez firmados (aspectos legales/auditoría). Correcciones no deben borrar historial.

**Decisión.** Encuentros con `status='signed'` no editables: RLS bloquea UPDATE (`using ... and status='draft'`), políticas DELETE solo borradores. Al pasar draft→signed se genera evento `sign` explícito en audit_log (trigger). Correcciones crean `encounter_versions` (snapshot JSON inmutable) con `reason`.

**Consecuencia.** Trazabilidad completa (quién firmó/cuándo + historial de correcciones). Cumple principio de no alteración de registros firmados.

## 11. Multi-tenant con org_id + RLS por org

**Contexto.** Sistema soporta múltiples clínicas (organizaciones). Necesario aislar datos estrictamente.

**Decisión.** Añadir `org_id` a entidades principales (doctors, services, holidays, availability_rules, time_off, appointments, notifications, patients con contexto ficha, etc.). RLS filtra por `auth_org_id()` (org del usuario autenticado). Rutas públicas aceptan `clinicSlug` para resolver org (branding + catálogo).

**Consecuencia.** Aislamiento fuerte por org. Migraciones backward-compatible con backfill a org default. Rutas públicas multi-tenant vía slug.

## 12. Rate limiting con fallback seguro

**Contexto.** El rate limiting no debe impedir el servicio cuando Redis Upstash no está configurado o no responde. En despliegues con varias instancias, el contador necesita storage compartido para mantener un límite consistente.

**Decisión.** `lib/ratelimit.ts` usa Upstash si las credenciales están presentes; de lo contrario, o si Redis falla, aplica un límite en memoria por instancia. Distingue por identidad (IP/headers). Límites razonables.

**Consecuencia.** El servicio sigue disponible sin Upstash. El fallback no se comparte entre instancias y se reinicia cuando una instancia se recicla; en producción multi-instancia Upstash sigue siendo recomendable para que el límite sea consistente.

## 13. Configuración fail-fast

**Contexto.** Errores de env (claves faltantes/invalidas) detectados tarde en producción son difíciles de diagnosticar.

**Decisión.** `lib/env.ts` valida esquema Zod completo al importar (server-side). Si falla, lanza error → arranque falla inmediatamente.

**Consecuencia.** Detecta problemas temprano (CI/build/dev). Evita comportamiento inesperado con valores undefined.

## 14. Días como claves UTC para cálculos de grid/weekday

**Contexto.** Cálculos de calendario (month grid, weekday) deben ser deterministas sin depender de timezone del proceso.

**Decisión.** Usar strings `YYYY-MM-DD` construidos con UTC (`new Date(\`${day}T00:00:00Z\`)`, `.toISOString().slice(0,10)`) en helpers como `addDaysToKey`, `weekdayOfKey`, `monthGridRange`, `addMonthsToKey`. Labels de mes usan UTC para consistencia.

**Consecuencia.** Calendarios consistentes globalmente. Evita desplazamientos sutiles.

## 15. Separación clientes Supabase (server/browser/admin)

**Contexto.** Diferentes contextos requieren distintos comportamientos (cookies SSR, cliente browser, bypass RLS con service role).

**Decisión.** Tres clientes: `server.ts` (SSR con cookies, `@supabase/ssr`), `browser.ts` (cliente React), `admin.ts` (service role, `server-only`, omite RLS). Uso explícito por capa.

**Consecuencia.** Seguridad correcta (admin nunca en cliente). Cookies gestionadas correctamente SSR. RLS respeta contexto.

## 16. Una sola página por URL: el landing es la raíz

**Contexto.** La carpeta `(site)` es un route group: los paréntesis no añaden segmento a la URL, solo sirven para compartir layout. Esto permitía que `app/page.tsx` (landing) y `app/(site)/page.tsx` (home de la clínica por defecto) resolvieran **las dos a `/`**. Next.js no define cuál gana: el build registraba las dos entradas en `app-path-routes-manifest.json` y ganaba una por orden interno, dejando la otra como código muerto y con riesgo de que dev y producción difieran (o de que una actualización de Next lo trate como error).

**Decisión.** Cada URL la define **exactamente una** página. La raíz `/` es el landing de producto (`app/page.tsx`, marketing). Se eliminó `app/(site)/page.tsx`. El home por clínica vive en `/[clinicSlug]`, y el group `(site)` se mantiene solo para `/reservar` y `/privacidad` con el branding de la organización por defecto.

**Consecuencia.** `/` tiene un dueño inequívoco y verificable en el manifest de build. Se elimina código muerto. Sin cambio visible: la raíz ya mostraba el landing. El home de la clínica por defecto (hero + datos de clínica + aviso al profesional) ya no existe en `/`; su equivalente por clínica sigue en `/[clinicSlug]`.

## 17. Cabeceras con hamburguesa y tablas con vista de tarjetas

**Contexto.** En móvil las cabeceras del panel y del sitio público no generaban menú de hamburguesa: eran filas únicas sin wrap que desbordaban horizontalmente toda la página (el proyecto no usa `overflow-x-hidden` global). Las tablas anchas obligaban a scroll horizontal.

**Decisión.** Patrón único de navegación móvil: enlaces ocultos bajo `md` y botón `Menu`/`X` (lucide-react, ya en el proyecto) que despliega un panel. Para tablas, vista de tarjetas en `md:hidden` y tabla en `hidden md:block`, reusando el patrón que ya existía en la agenda. Los elementos que no caben (odontograma, calendario mensual) usan scroll horizontal contenido (`overflow-x-auto` + `min-w-max`).

**Consecuencia.** Sin desbordes a nivel de página y navegación usable en teléfono. Costo: el markup móvil y de escritorio coexisten en el DOM, por lo que los tests que cuentan enlaces (`tests/nav-links.test.tsx`) dependen de que el panel esté cerrado al renderizar. No se usa `overflow-x-hidden` global: preferimos corregir la causa.

## Notas

- Decisiones basadas exclusivamente en código/migraciones revisadas (package.json, lib/*, app/api/*, supabase/migrations/*, DECISIONS.md existente, tests).
- Elementos marcados **POR CONFIRMAR** en otros docs indican información no verificable en código (no inventada).
- Algunas decisiones (ej. VTIMESZONE, solapamiento) ya documentadas en DECISIONS.md original y verificadas.