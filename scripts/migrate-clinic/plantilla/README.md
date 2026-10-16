# Plantilla de migración — CSV canónico v1

Archivos de ejemplo para migrar una clínica a Agenda Online. Cada archivo trae
2-3 filas de ejemplo: **bórralas y completa con los datos reales**, o pide tu
exportación al sistema actual y la adaptamos nosotros (ver `docs/MIGRACION.md`).

## Convenciones (valen para los 4 archivos)

- Separador coma (también aceptamos punto y coma), codificación UTF-8.
- La primera fila son los encabezados: no los cambies ni agregues columnas.
- Fechas y horas en formato `YYYY-MM-DD HH:MM` (hora de Chile).
  - `fecha_nacimiento`: solo fecha `YYYY-MM-DD`.
  - `inicio` (citas): fecha y hora `YYYY-MM-DD HH:MM`.
- RUT con o sin puntos y guion (`12.345.678-5` o `123456785`): lo normalizamos
  nosotros, pero el dígito verificador debe ser correcto.
- Teléfono con o sin `+56`: si falta, lo agregamos.
- Celda vacía = dato ausente (no se inventa nada).
- `id_externo`: el código que el paciente/profesional/servicio tenía en el
  sistema anterior. Sirve para cruzar archivos entre sí. Si no lo tienes,
  déjalo vacío y cruza por email (profesionales) o email/RUT (pacientes).

## Archivos

### `profesionales.csv`
Quienes atienden. El `email` crea su usuario de acceso a la plataforma.
`admin`: `si` o `no` (vacío = `no`).

### `servicios.csv`
Prestaciones con su duración en minutos (`duracion_min` entero mayor a 0).
El nombre debe ser único dentro de la clínica.

### `pacientes.csv`
`nombre` es lo único obligatorio. Recomendamos traer al menos RUT o email:
sin ninguno de los dos no podemos detectar duplicados y la fila queda marcada
para revisión manual. `profesional` asigna tratante (email o `id_externo` de
`profesionales.csv`); vacío = sin asignar. `sexo`: `female`, `male`, `other`
o `undisclosed`.

### `citas.csv`
`profesional` y `paciente` se cruzan por email, RUT o `id_externo` contra los
otros archivos. `servicio` es opcional pero recomendado (define la duración).
`estado` (vacío = automático: `confirmada` si es futura, `realizada` si pasó):

- `confirmada`, `por_confirmar`, `cancelada`, `realizada`, `no_asistio`.

Si tu sistema usa otros nombres de estado, escríbelos igual en una columna
aparte o avísanos: los traducimos nosotros, no inventes equivalencias.
