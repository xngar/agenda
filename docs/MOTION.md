# Sistema de motion del panel

Transiciones y microinteracciones del panel privado (`/dashboard`). La idea es
que la información **llegue** en vez de aparecer de golpe, sin que ninguna
animación tape el trabajo del usuario.

## Reglas de casa

- **Sutileza**: la animación acompaña, nunca protagoniza. Ante la duda, no se anima.
- **Duraciones**: microinteracciones 120–200 ms, transiciones de elemento 200–300 ms, entradas de sección o página hasta 400 ms.
- **Easing**: `out` para entradas, `in` para salidas, `in-out` para cambios de estado. Sin rebotes.
- **Sólo `transform` y `opacity`**: nunca `width`, `height`, `top` ni `left`. El shimmer de los skeletons es la única excepción (anima `background-position`, que no provoca reflow).
- **`prefers-reduced-motion`**: con esa preferencia activa todo se reduce a fundidos simples o se desactiva. El bloque global de `app/globals.css` ya lo anula para el CSS; para `motion/react` cada componente consulta `useReducedMotion()`.
- **Overlays en portal**: una animación con `fill-mode: both` deja un contexto de apilamiento al terminar, y cualquier diálogo dentro de esa vista queda debajo del header sticky. Las vistas usan `backwards` y los diálogos del panel se montan en `document.body` con `Modal`.

## Tokens

Viven en `:root` dentro de `app/globals.css`. Los mismos valores están en
`lib/motion.ts` para `motion/react`: son un único sistema, no dos.

| Token CSS | Constante TS | Valor | Para qué |
|---|---|---|---|
| `--motion-duration-micro` | `DUR.micro` | 150 ms | hover, focus, press, indicador |
| `--motion-duration-element` | `DUR.element` | 240 ms | modal, menú, fila, panel |
| `--motion-duration-section` | `DUR.section` | 320 ms | entrada de sección o página |
| `--motion-duration-view` | `DUR.view` | 200 ms | cambio de vista o de ruta |
| `--motion-duration-count` | `DUR.count` | 400 ms | conteo animado de un número |
| `--motion-ease-out` | `EASE.out` | `cubic-bezier(0.16, 1, 0.3, 1)` | entradas |
| `--motion-ease-in` | `EASE.in` | `cubic-bezier(0.4, 0, 1, 1)` | salidas |
| `--motion-ease-in-out` | `EASE.inOut` | `cubic-bezier(0.4, 0, 0.2, 1)` | cambios de estado |
| `--motion-distance-sm/md/lg` | `DIST.sm/md/lg` | 8 / 10 / 12 px | desplazamiento vertical de las entradas |
| `--motion-stagger` | `STAGGER` | 35 ms | separación entre elementos escalonados |

**Para ajustar el ritmo de todo el panel basta con editar `:root` en
`app/globals.css`** y los valores correspondientes en `lib/motion.ts`.

### Utilities Tailwind

Tailwind v4 no tiene namespace `--duration-*`, así que las duraciones se
declaran a mano con `@utility` en `app/globals.css`:

- `duration-micro`, `duration-element`, `duration-section`, `duration-view`
- `ease-out-soft`, `ease-in-soft`, `ease-in-out-soft` (vienen de `@theme inline`)

### Clases CSS propias

| Clase | Qué hace |
|---|---|
| `.anim-fade-up` | Entrada estándar: fade + 10 px de desplazamiento (320 ms) |
| `.anim-row-in` | Entrada de una fila de tabla (240 ms). Se escala con `animation-delay` |
| `.anim-view-fade` | Fundido de 200 ms al cambiar de vista o de ruta |
| `.anim-menu` | Menú contextual: fade + scale corto |
| `.anim-modal-in` | Modal: fade + desplazamiento + scale |
| `.skeleton-shimmer` | Barrido de luz sobre los bloques de carga |
| `.row-highlight` | Resaltado temporal de una fila recién tocada |
| `.anim-sort-icon` | Rotación del ícono de ordenamiento |

## Componentes reutilizables (`components/motion/`)

| Componente | Para qué |
|---|---|
| `AnimatedNumber` | KPIs y contadores que cuentan hacia su valor final |
| `AsyncButton` | Botones con acción asíncrona: spinner superpuesto (sin salto de layout) y, en modo autónomo, confirmación de éxito/error |
| `Modal` | Diálogo del panel: portal a `document.body`, centrado vertical, foco, Escape y click fuera |
| `RouteFade` | Fundido breve al cambiar de ruta dentro del panel |
| `use-motion-prefs` | `useReducedMotion` + variantes ya neutralizadas |

`Modal` tiene dos modos de presencia:

- **Controlado** (`open`): el componente se mantiene montado y su `AnimatePresence`
  interno anima la entrada y la salida. Es el modo de los formularios
  (`<Modal open={abierto}>`).
- **Del padre** (sin `open`): el componente se monta dentro de un
  `AnimatePresence` del padre y hereda de ahí la animación de salida
  (`{abierto ? <Modal /> : null}`).

En ambos casos se monta en `document.body`, así que el header sticky del panel
(`z-30`) no puede taparlo. El centrado usa `items-start` + `my-auto`: el panel
queda centrado verticalmente cuando cabe en la pantalla y, cuando es más alto,
los márgenes se resuelven a cero y el scroll llega hasta el título.

`AsyncButton` tiene dos modos:

- **Controlado** (`loading`): el padre manda. Sólo muestra el spinner; el resultado se avisa por el canal que ya use el padre (un toast). Es el modo de los formularios.
- **Autónomo** (`onClick` sin `loading`): el botón ejecuta la acción y muestra "Listo" o "No se pudo" sobre sí mismo durante 1,6 s.

## Componentes propios (`components/ui/`)

- `checkbox.tsx`: `<input type="checkbox">` nativo con la marca dibujada en CSS, para que entre con un scale corto. El input sigue siendo nativo: foco, teclado y lectores de pantalla no cambian.
- `tooltip.tsx`: tooltip de Radix con 300 ms de retraso de entrada.

## Verificación

`scripts/panel-motion-check.mjs` entra al panel con un profesional de prueba y
comprueba, en navegador real, que no haya errores de consola, que los tokens
estén resueltos, que las filas entren escalonadas y que el ícono de ordenamiento
rote.

```
npm run build
npm run start                       # en otra terminal
PANEL_EMAIL=... PANEL_PASSWORD=... npm run check:motion
```

Las credenciales se leen del entorno: no se guardan en el repositorio.
