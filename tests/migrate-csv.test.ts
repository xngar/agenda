import { describe, expect, it } from "vitest";
import { checkHeaders, parseCsv } from "@/scripts/migrate-clinic/csv";

describe("parseCsv", () => {
  it("detecta coma y respeta encabezados", () => {
    const t = parseCsv("a,b\n1,2\n3,4\n");
    expect(t.delimiter).toBe(",");
    expect(t.headers).toEqual(["a", "b"]);
    expect(t.rows).toHaveLength(2);
    expect(t.rows[0]).toMatchObject({ line: 2, values: { a: "1", b: "2" } });
  });

  it("detecta punto y coma (Excel chileno) y comillas", () => {
    const t = parseCsv('nombre;nota\n"Juan; Pérez";"hola, mundo"\n');
    expect(t.delimiter).toBe(";");
    expect(t.rows[0]?.values).toMatchObject({ nombre: "Juan; Pérez", nota: "hola, mundo" });
  });

  it("ignora BOM y líneas vacías", () => {
    const t = parseCsv("﻿a,b\n\n1,2\n\n");
    expect(t.headers).toEqual(["a", "b"]);
    expect(t.rows).toHaveLength(1);
  });
});

describe("checkHeaders", () => {
  it("acepta exactos y rechaza distintos", () => {
    expect(checkHeaders(["a", "b"], ["a", "b"])).toBeNull();
    expect(checkHeaders(["a", "c"], ["a", "b"])).toContain("encabezados");
    expect(checkHeaders(["a"], ["a", "b"])).toContain("encabezados");
  });
});
