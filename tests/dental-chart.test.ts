import { describe, expect, it } from "vitest";
import { aggregateToothState, TOOTH_STATE_PRIORITY } from "@/lib/ficha/dental";

describe("aggregateToothState", () => {
  it("sin caras registradas no hay estado", () => {
    expect(aggregateToothState([])).toBeUndefined();
    expect(aggregateToothState([undefined, null, ""])).toBeUndefined();
  });

  it("cada estado pinta su color (ya no quedan grises fantasmas)", () => {
    for (const estado of [
      "extraida",
      "ausente",
      "caries",
      "por_extraer",
      "endodoncia",
      "fractura",
      "obturada",
      "corona",
      "puente",
      "implante",
      "sellante",
      "desgaste",
      "incluida",
      "protesis_removible",
    ]) {
      expect(aggregateToothState([estado, undefined, undefined, undefined, undefined])).toBe(estado);
    }
  });

  it("gana el estado de mayor prioridad", () => {
    expect(aggregateToothState(["obturada", "caries", "sana", undefined, undefined])).toBe("caries");
    expect(aggregateToothState(["sana", "sana", "ausente", "sana", "sana"])).toBe("ausente");
    expect(aggregateToothState(["corona", "obturada", undefined, undefined, undefined])).toBe("obturada");
  });

  it("sana sólo si todas las caras están registradas y sanas", () => {
    expect(aggregateToothState(["sana", "sana", "sana", "sana", "sana"])).toBe("sana");
    expect(aggregateToothState(["sana", undefined, undefined, undefined, undefined])).toBeUndefined();
  });

  it("ignora estados desconocidos", () => {
    expect(aggregateToothState(["invento", undefined, undefined, undefined, undefined])).toBeUndefined();
    expect(aggregateToothState(["invento", "sellante", undefined, undefined, undefined])).toBe("sellante");
  });

  it("la prioridad cubre todos los estados del odontograma", () => {
    for (const estado of [
      "sana", "caries", "obturada", "fractura", "desgaste", "sellante", "ausente",
      "por_extraer", "extraida", "endodoncia", "corona", "puente", "implante",
      "protesis_removible", "incluida",
    ]) {
      expect(TOOTH_STATE_PRIORITY).toContain(estado);
    }
  });
});
