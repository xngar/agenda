import { describe, expect, it } from "vitest";
import { dateKey, formatTime, zonedInstant } from "@/lib/dates";

/**
 * Cambio de hora en America/Santiago.
 *
 * Chile adelanta el reloj el primer sábado de septiembre (el domingo siguiente
 * no existe la hora 00:00-00:59) y lo atrasa el primer sábado de abril (la hora
 * 23:00-23:59 se repite). Ese día tiene 23 o 25 horas.
 *
 * Importa porque la agenda se calcula en la zona de la clínica: si "qué día es
 * esta cita" o "qué hora es" se resuelve con la zona del proceso o del
 * navegador, un bloque queda una hora corrido y, en el peor caso, la cita
 * aparece en el día equivocado.
 *
 * Los tests de abajo NO fijan el valor al que la librería normaliza la hora
 * inexistente (cambia entre versiones de date-fns-tz): verifican el invariante
 * que de verdad importa, que es que toda hora local existente vuelve a sí misma
 * y a su día.
 */

const TZ = "America/Santiago";

/** Días de 2026, de lunes a sábado: nunca son día de cambio de hora. */
function diasLaborables(anio: number) {
  const dias: string[] = [];
  for (let d = new Date(Date.UTC(anio, 0, 1)); d.getUTCFullYear() === anio; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay();
    if (dow !== 0) dias.push(d.toISOString().slice(0, 10));
  }
  return dias;
}

function domingos(anio: number) {
  const dias: string[] = [];
  for (let d = new Date(Date.UTC(anio, 0, 1)); d.getUTCFullYear() === anio; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 0) dias.push(d.toISOString().slice(0, 10));
  }
  return dias;
}

function horas(desde: number, hasta: number) {
  const lista: string[] = [];
  for (let h = desde; h <= hasta; h += 1) lista.push(`${String(h).padStart(2, "0")}:00`);
  return lista;
}

describe("cambio de hora en la zona de la clínica", () => {
  it("toda hora local de un día normal vuelve a sí misma y a su día", () => {
    const dias = diasLaborables(2026);
    expect(dias.length).toBeGreaterThan(300);

    for (const dia of dias) {
      for (const hora of horas(0, 23)) {
        const instante = zonedInstant(dia, hora, TZ);
        expect(formatTime(instante, TZ), `${dia} ${hora}`).toBe(hora);
        expect(dateKey(instante, TZ), `${dia} ${hora}`).toBe(dia);
      }
    }
  });

  it("en el domingo del cambio siguen valiendo las horas centrales del día", () => {
    // Los domingos son el único día que puede tener 23 o 25 horas, así que ahí
    // se prueban las horas que existen en ambos casos. La 00:xx puede no existir
    // (adelantamiento) y la 23:xx puede estar repetida (atrasamiento).
    for (const dia of domingos(2026)) {
      for (const hora of horas(1, 22)) {
        const instante = zonedInstant(dia, hora, TZ);
        expect(formatTime(instante, TZ), `${dia} ${hora}`).toBe(hora);
        expect(dateKey(instante, TZ), `${dia} ${hora}`).toBe(dia);
      }
    }
  });

  it("el cambio de hora existe y afecta a la madrugada, no a la agenda entera", () => {
    // Al menos un domingo del año no tiene hora 00:xx local: la librería
    // normaliza esa pared a un instante real (no lanza), y lo importante es que
    // no se reporte la hora pedida como si existiera.
    const rotos = domingos(2026).filter((dia) => {
      const pedida = "00:30";
      const obtenida = formatTime(zonedInstant(dia, pedida, TZ), TZ);
      return obtenida !== pedida;
    });

    // Chile adelanta una vez al año: exactamente un domingo se rompe.
    expect(rotos).toHaveLength(1);
    expect(rotos[0]).toMatch(/^2026-\d{2}-\d{2}$/);
  });

  it("una cita nocturna pertenece al día local, no al siguiente en UTC", () => {
    // 23:30 en Santiago. En UTC ya es el día siguiente, así que agrupar por UTC
    // correría la cita de día.
    const noche = zonedInstant("2026-10-05", "23:30", TZ);
    expect(formatTime(noche, TZ)).toBe("23:30");
    expect(dateKey(noche, TZ)).toBe("2026-10-05");
    expect(dateKey(noche, "UTC")).not.toBe("2026-10-05");
  });

  it("el agrupamiento por día cambia según la zona de la clínica", () => {
    // Mismo instante, dos zonas: es el caso que rompe el multi-tenant con
    // America/Santiago fijo en el código.
    const instante = "2026-10-05T02:30:00Z"; // 23:30 del 4 en Santiago
    expect(dateKey(instante, "America/Santiago")).toBe("2026-10-04");
    expect(dateKey(instante, "Asia/Tokyo")).toBe("2026-10-05");
  });
});