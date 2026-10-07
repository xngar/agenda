/**
 * Servicios y horario con los que arranca una clínica nueva, y con los que
 * un profesional recién agregado al equipo empieza a ofrecer horas.
 */

/** Servicios con los que arranca cualquier clínica nueva. */
export const DEFAULT_SERVICES: { name: string; duration_min: number }[] = [
  { name: "Control", duration_min: 30 },
  { name: "Limpieza", duration_min: 45 },
  { name: "Urgencia", duration_min: 30 },
];

/**
 * Horario por defecto. `weekday` sigue la convención de Postgres
 * (0 = domingo). El domingo se omite a propósito.
 */
export const DEFAULT_AVAILABILITY: { weekday: number; windows: [string, string][] }[] = [
  { weekday: 1, windows: [["09:00", "13:00"], ["15:00", "19:00"]] },
  { weekday: 2, windows: [["09:00", "13:00"], ["15:00", "19:00"]] },
  { weekday: 3, windows: [["09:00", "13:00"], ["15:00", "19:00"]] },
  { weekday: 4, windows: [["09:00", "13:00"], ["15:00", "19:00"]] },
  { weekday: 5, windows: [["09:00", "13:00"], ["15:00", "19:00"]] },
  { weekday: 6, windows: [["09:00", "13:00"]] },
];
