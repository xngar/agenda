# Decisiones de diseño

Registro de decisiones que no son obvias al leer el código, con el motivo.
El formato sigue el de ADR simplificado: contexto, decisión, consecuencia.

---

## 1. El día es una clave de texto (`"2026-10-05"`), no una fecha

**Contexto.** El servidor puede quedar en UTC y el navegador del paciente en
cualquier zona. Un "día hábil" es un concepto de calendario civil, no un
instante.

**Decisión.** Todo día hábil se representa como `"yyyy-MM-dd"` y se calcula
con operaciones UTC (`addDaysToKey`, `weekdayOfKey` en `lib/dates.ts`). La
conversión a instante ocurre recién al elegir la hora, vía `zonedInstant`.

**Consecuencia.** Sumar un día es determinista y no depende del reloj del
servidor ni de la zona del cliente. Cuesta un poco más de código, pero evita
que un lunes al atardecer aparezca como domingo.

---

## 2. La disponibilidad se calcula en Postgres, no en la aplicación

**Contexto.** Las horas dependen de reglas semanales, vacaciones, feriados y
citas existentes. Si se calculara en Node o se guardaran "slots"
precalculados, habría que invalidarlos en cada cambio.

**Decisión.** Las funciones de disponibilidad viven en Postgres y se consultan
por RPC. El cliente nunca decide si una hora está libre.

**Consecuencia.** Una sola fuente de verdad y el doble booking se evita en la
base, no en la interfaz. A cambio, la lógica de agenda es SQL y hay que
recordarlo al tocar el esquema.

---

## 3. Filtrar una cita por solapamiento, nunca por comparación directa

**Contexto.** Una cita ocupa un rango (`tstzrange`). Consultar "las citas de
hoy" con `during.gte(inicio).lte(fin)` **no funciona**: Postgres intenta
comparar un rango con un instante y responde `malformed range literal`.

**Decisión.** La RPC `dashboard_appointments` (migración `...0010`) usa el
operador de solapamiento `&&` contra un `tstzrange` construido con los
límites del día en `America/Santiago`.

**Consecuencia.** La agenda del panel no puede volver a salir vacía por
error de sintaxis. El error anterior era silencioso desde el punto de vista
del test: la página mostraba un aviso y el caso "verde" sólo buscaba el
nombre del paciente en el HTML. Desde entonces `scripts/panel-check.mjs`
falla si aparece el mensaje de error.

---

## 4. RLS es la autoridad; el proxy sólo es una cortina

**Contexto.** Un panel privado necesita bloquear el acceso rápido, pero
proteger en el proxy da una falsa sensación de seguridad si las políticas no
están.

**Decisión.** `proxy.ts` revisa el cookie y redirige si no hay sesión
(comprobación optimista, sin coste de red). La autorización real vive en las
políticas RLS y en los layouts de servidor, que además consultan la sesión.

**Consecuencia.** Un token manipulado no abre nada. El proxy se puede quitar
sin abrir un agujero.

---

## 5. El `.ics` se emite en UTC puro, sin `VTIMEZONE`

**Contexto.** Chile cambia de hora dos veces al año. Un `VTIMEZONE` con las
transiciones hardcodeadas se desactualiza y desplaza la cita un año después
de publicarse.

**Decisión.** Los instantes van como `DTSTART:20261002T120000Z`. La zona de la
clínica sólo aparece en el texto legible de la descripción.

**Consecuencia.** La cita es un instante absoluto y el teléfono la muestra en
su zona. A cambio, el .ics no muestra "09:00" como horario de la clínica:
quien lo abra en otra zona ve su hora local, que es el comportamiento
correcto para un evento puntual.

---

## 6. Un token cifrado y de un solo uso para gestionar la cita

**Contexto.** El paciente recibe un enlace por correo para cambiar o cancelar
su cita. El enlace no debe permitir adivinar ni reutilizar.

**Decisión.** Se guarda un secreto cifrado con AES-256-GCM
(`manage_token_secrets`) y se manda el material por el correo. El token se
invalida al usarlo.

**Consecuencia.** No hay tokens en la base que sirvan paravigilar, y un
enlace filtrado sirve una sola vez. Rotar `MANAGE_TOKEN_KEY` invalida los
enlaces ya enviados: hay que avisar a los pacientes con citas pendientes.

---

## 7. RUT: sólo para identificar al paciente

**Contexto.** La clínica exige RUT en la ficha. Es un identificador, no un
dato de salud.

**Decisión.** Se pide y se valida con el algoritmo oficial (módulo 11, ciclo
de pesos 2,3,4,5,6,7). Se acepta el formato con puntos, con guiones o sin
separador, y el verificador `K`.

**Consecuencia.** Se validan los dígitos verificadores, no sólo la forma. El
formato no se impose: `normalizeRut` quita puntos, guiones y espacios.

---

## 8. La reserva se confirma en la base y se avisa después

**Contexto.** Si el correo falla, la cita ya está tomada. Al revés, si se
avisa primero y la reserva falla, se envía una confirmación falsa.

**Decisión.** Primero la reserva con la función transaccional, después el
correo y la notificación. Un fallo de correo se registra, no deshace la cita.

**Consecuencia.** La clínica nunca pierde una reserva por un problema de SMTP.
El paciente podría no recibir el aviso: por eso el enlace de gestión va
también en un segundo correo y el panel puede contactar al paciente.

---

## 9. Se acepta la alerta de `npm audit` sobre Vitest

**Contexto.** `npm audit` reporta 3 vulnerabilidades moderadas, todas en
`@vitest/mocker` (dependencia transitiva de `vitest`), con el aviso
GHSA-82fw-gwwq-j7x9: path traversal al redirigir un mock de sistema de
archivos. La corrección oficial exige `vitest@5`, un salto de versión mayor.

**Decisión.** No se aplica el parche. `vitest` es una dependencia de
desarrollo: no se importa desde el código de la aplicación, no entra en el
build y no se despliega. El fallo requiere código de prueba que redirija un
mock hacia rutas arbitrarias, algo que este repositorio no hace.

**Consecuencia.** Riesgo aceptado y acotado al entorno de pruebas. Queda
pendiente subir a Vitest 5 cuando se planifique actualizar el runner, con la
suite como red de seguridad: si la suite sigue en verde tras el salto, no hay
razón para mantener la versión anterior.

---

## 10. Una reserva nace "por confirmar" y la confirma la clínica

**Contexto.** El estado `pending` estaba en el CHECK de la base, en los
índices y en todas las consultas que liberan el horario
(`status in ('pending','confirmed')`), pero el default de la columna era
`'confirmed'`. Es decir, el estado existía en todas partes salvo en el único
sitio donde tendría que nacerse: nadie lo generaba nunca.

**Decisión.** `alter table appointments alter column status set default
'pending'` (migración `...0011`). La clínica ve «Por confirmar» y confirma
desde el panel.

**Consecuencia.** El paciente recibe "Cita reservada" y su horario queda
bloqueado igual que antes, porque `pending` cuenta como ocupado en las
consultas de disponibilidad. Lo que cambia es que la clínica tiene una
confirmación que dar. Se cambió el default de la columna en lugar de añadir
`status` al `INSERT` de `book_appointment`: esa función está redefinida en la
migración `0007` y el `INSERT` no nombra la columna, así que alterar el
default cubre las dos versiones y cualquier vía de inserción futura.

El botón «Confirmar» sólo aparece mientras el estado es `pending`, y la
prueba de panel verifica las dos caras: que aparece en una cita pendiente y
que desaparece después de confirmar.

---

## 11. La disponibilidad se calcula en un solo lugar, incluso lo inactivo

**Contexto.** `get_available_slots_any` filtraba `where d.active` y
`book_appointment` exigía `s.active and d.active`, pero `get_available_slots`
—la función que el paciente consulta al elegir hora— no miraba `active` en
absoluto.

**Decisión.** El filtro se puso dentro de `get_available_slots` (migración
`...0012`), que es el único punto por donde pasan todas las rutas, en vez de
taparlo en la ruta de Next.

**Consecuencia.** Se eliminó una contradicción visible: un profesional
desactivado desaparecía del asistente, pero si el paciente tenía la página
abierta o pedía sus horas con el `doctorId` en la URL, le mostraban horas que
el servidor le negaba al confirmar. Corregirlo en la función evita que
cualquier llamada futura reintroduzca el problema.

Consecuencia operativa: desactivar a un profesional esconde sus horas pero
**no borra** sus citas. Hay que reasignarlas antes.