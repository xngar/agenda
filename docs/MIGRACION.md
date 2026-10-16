# Migración de clínicas a Agenda Online

Cómo traer pacientes, citas e historial de una clínica que hoy opera en otro
sistema (AgendaPro, Dentalink, Doctoralia, Reservo, Encuadrado) o en planilla.

**Principio operativo:** la clínica no llena plantillas ni toca bases de
datos. Exporta lo que su sistema le permita y nos manda los archivos; nosotros
normalizamos, validamos, importamos y verificamos. Todo el flujo es asistido.

## 1. Alcance

**Se migra:** profesionales (con acceso), servicios, pacientes (+ antecedentes
básicos), citas futuras (nacen `confirmed`) y citas pasadas (historial).

**No se migra:** contraseñas, tokens de gestión viejos (se regeneran),
notificaciones, audit log (se parte de cero con nota de origen), horarios y
feriados (se reconfiguran en el panel: son reglas, no datos).

**Historial clínico profundo** (atenciones por especialidad, odontograma,
recetas, adjuntos, pagos): Fase 3, caso a caso según lo que traiga la fuente.

## 2. Formato canónico

`scripts/migrate-clinic/plantilla/` (`profesionales.csv`, `servicios.csv`,
`pacientes.csv`, `citas.csv` + `README.md`). Convenciones: coma o punto y
coma, UTF-8, fechas `YYYY-MM-DD HH:MM` en hora de Chile, RUT y teléfono en
cualquier formato razonable (se normalizan), celda vacía = dato ausente.

## 3. Reglas de fusión y validación

- **Pacientes:** el email manda, el RUT secunda. Si ambos calzan con fichas
  distintas, o no hay ni email ni RUT, la fila queda marcada para revisión
  manual (nunca se fusiona a ciegas). RUT con verificador inválido = error.
- **Resto de campos:** se fusiona sin pisar datos existentes (solo completa
  vacíos).
- **Profesionales/servicios:** se cruzan por email o `id_externo`; servicios
  por nombre (único por clínica). Sin match = error, no se inventa.
- **Citas:** profesional y paciente deben existir en los otros archivos.
  Futuras sin estado nacen `confirmada`; pasadas sin estado, `realizada`.
  Solapes entre citas activas del mismo profesional = error (la BD también
  los rechaza con la exclusión anti-solapamiento).
- **Estados aceptados:** `confirmada`, `por_confirmar`, `cancelada`,
  `realizada`, `no_asistio`. Otros nombres se traducen en el perfil de la
  fuente, nunca a ojo en la planilla.

## 4. Cómo exportar desde tu sistema actual

Pídele a la clínica **todo** (pacientes + citas + fichas + adjuntos) en el
primer envío: filtrar de más es más barato que pedir un segundo export.

- **AgendaPro** (autogestión): *Clientes → Base de clientes → Acciones →
  Reporte de fichas* (Excel masivo) + descarga de base de clientes.
- **Dentalink** (autogestión): *Reportes → Reportes Excel*: listado y
  evoluciones de pacientes, odontograma, citas de agenda, etc. (50+ reportes).
- **Doctoralia** (autogestión, con plazos): *Ajustes → Descargar datos*:
  pacientes, expedientes, citas, adjuntos → `.zip` por email (clave por SMS,
  tarda horas o días). Solo trae expedientes en planes Plus/VIP. **Exportar
  antes de dar de baja**: al terminar suspenden el acceso.
- **Reservo** (mixto): base de pacientes, citas y servicios con botón (admin,
  llega por email). Fichas clínicas masivas (*Exportar Fichas*): el admin
  titular debe pedir activación a `soporte@reservo.cl`.
- **Encuadrado** (vía proveedor): no hay exportación masiva documentada.
  Pedir a su soporte el dump de pacientes, citas y fichas; de respaldo,
  descargas puntuales por pantalla.

Base legal si un proveedor traba la entrega: Ley 19.628 (derechos ARCO y
portabilidad): los datos son del responsable (la clínica), el proveedor es
mero encargado y no puede retenerlos.

## 5. Intake por clínica (checklist)

1. Ficha intake: sistema actual, nº pacientes, nº profesionales, ¿citas
   futuras cargadas dónde?, ¿archivos (RX, consentimientos) dónde?
2. Recepción del export (aunque venga feo) o plantilla llena.
3. `dry-run` + reporte: válidos, duplicados, errores por fila, sin match.
4. Aprobación escrita de la clínica (correo basta) con conteos.
5. `import` por lotes en orden: usuarios Auth → doctores → servicios →
   pacientes → citas futuras → citas pasadas → (Fase 3) historial clínico.
6. `verify`: conteos origen vs destino + muestra en pantalla.
7. Clínica opera; sistema viejo se da de baja **después** (ver punto 4).

## 6. Privacidad y consentimiento

- Acuerdo de encargado de tratamiento firmado **antes** de recibir archivos.
- `consent_at` de pacientes migrados = fecha de la migración con nota de
  origen (relación previa en sistema anterior). No se inventan consentimientos.
- Archivos fuente: canal privado, borrado tras verificación + 30 días.

## 7. Estado de implementación

- [x] CSV canónico + plantilla + este documento.
- [x] Script `scripts/migrate-clinic/` (`npm run migrate:clinic -- --org=<slug> --dir=<carpeta> --cmd=dry-run|import|verify|rollback [--run=<id>]`).
- [ ] Perfiles por fuente, en orden: AgendaPro → Dentalink → Doctoralia →
      Reservo → Encuadrado.
- [ ] Fase 3: historial clínico profundo.
- [ ] **Diferido a propósito:** tablas `import_batches`/`import_items` en BD
      (trazabilidad hoy en archivo local por corrida; se evalúa si el flujo
      se vuelve autogestionado).
