import { DEFAULT_TIMEZONE, dateKey } from "@/lib/dates";
import { parseAppointmentRange } from "@/lib/range";
import type { DoctorAppointment } from "@/lib/types";

/**
 * Citas agrupadas por día LOCAL de la clínica, no por día UTC: una cita de las
 * 23:30 en Santiago pertenece a ese día aunque en UTC ya sea el siguiente.
 * Cada lista queda ordenada por hora de inicio. Lo usan la vista mes y la
 * semanal.
 *
 * La zona es la de la organización (`organizations.timezone`), no la constante
 * por defecto: con más de una clínica en el país, agrupar en Santiago movería
 * las citas de la otra clínica al día equivocado.
 */
export function appointmentsByDay(
  citas: DoctorAppointment[],
  timezone: string = DEFAULT_TIMEZONE,
): Map<string, { cita: DoctorAppointment; start: string; end: string }[]> {
  const mapa = new Map<string, { cita: DoctorAppointment; start: string; end: string }[]>();

  for (const cita of citas) {
    const { start, end } = parseAppointmentRange(cita.during);
    if (!start) continue;
    const key = dateKey(start, timezone);
    const item = { cita, start, end };
    const lista = mapa.get(key);
    if (lista) lista.push(item);
    else mapa.set(key, [item]);
  }

  for (const lista of mapa.values()) {
    lista.sort((a, b) => a.start.localeCompare(b.start));
  }
  return mapa;
}

/* ------------------------------------------------------------------ */
/* Reparto en carriles (grilla semanal)                                */
/* ------------------------------------------------------------------ */

export interface BloqueHorario {
  id: string;
  /** Minutos desde la medianoche local. */
  startMin: number;
  endMin: number;
}

/**
 * Reparte bloques que se solapan en carriles laterales, como una agenda por
 * horas: en vez de taparse, dos citas a la misma hora quedan una al lado de la
 * otra y cada una usa la mitad del ancho.
 *
 * Hace falta aunque el filtro de profesional impida solapamientos (la
 * exclusión anti doble reserva lo garantiza), porque en la vista de "todo el
 * equipo" conviven profesionales y sí se pisan.
 *
 * Devuelve, por bloque, su carril y cuántos carriles ocupa el grupo al que
 * pertenece. Un grupo es una cadena de citas que se tocan de forma transitiva:
 * si A se pisa con B y B con C, las tres comparten ancho aunque A y C no se
 * toquen entre sí.
 */
export function repartirEnCarriles(
  bloques: BloqueHorario[],
): Map<string, { carril: number; carriles: number }> {
  const ordenados = [...bloques].sort(
    (a, b) => a.startMin - b.startMin || a.endMin - b.endMin || a.id.localeCompare(b.id),
  );

  const reparto = new Map<string, { carril: number; carriles: number }>();
  // Fin de cada carril que ya se está usando.
  const fines: number[] = [];

  let grupo: BloqueHorario[] = [];
  let finGrupo = -Infinity;
  let carriles = 0;

  const cerrarGrupo = () => {
    if (grupo.length === 0) return;
    for (const bloque of grupo) {
      const dato = reparto.get(bloque.id);
      if (dato) reparto.set(bloque.id, { carril: dato.carril, carriles });
    }
    grupo = [];
    carriles = 0;
  };

  for (const bloque of ordenados) {
    // El bloque ya no se solapa con nada del grupo: arranco uno nuevo.
    if (grupo.length > 0 && bloque.startMin >= finGrupo) cerrarGrupo();

    let carril = fines.findIndex((fin) => fin <= bloque.startMin);
    if (carril === -1) {
      fines.push(bloque.endMin);
      carril = fines.length - 1;
    } else {
      fines[carril] = bloque.endMin;
    }

    reparto.set(bloque.id, { carril, carriles: 1 });
    grupo.push(bloque);
    finGrupo = Math.max(finGrupo, bloque.endMin);
    carriles = Math.max(carriles, carril + 1);
  }
  cerrarGrupo();

  return reparto;
}