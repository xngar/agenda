/**
 * Lector CSV mínimo para migraciones asistidas.
 *
 * Sin dependencias nuevas a propósito: los archivos los genera o bien
 * nuestra plantilla (coma) o Excel chileno (punto y coma). Soporta
 * comillas dobles y BOM; no pretende ser un parser general.
 */

export interface CsvTable {
  headers: string[];
  delimiter: string;
  rows: { line: number; values: Record<string, string> }[];
}

function detectDelimiter(headerLine: string): string {
  const semis = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semis > commas ? ";" : ",";
}

function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

export function parseCsv(content: string): CsvTable {
  const clean = content.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = clean.split("\n").filter((l) => l.trim() !== "");
  if (lines.length === 0) return { headers: [], delimiter: ",", rows: [] };
  const delimiter = detectDelimiter(lines[0]!);
  const headers = splitLine(lines[0]!, delimiter);
  const rows = lines.slice(1).map((line, i) => {
    const cells = splitLine(line, delimiter);
    const values: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) values[headers[c]!] = cells[c] ?? "";
    return { line: i + 2, values };
  });
  return { headers, delimiter, rows };
}

export function checkHeaders(actual: string[], expected: string[]): string | null {
  const a = actual.map((h) => h.trim());
  if (a.length !== expected.length || !expected.every((h, i) => a[i] === h)) {
    return `encabezados: se esperaba [${expected.join(",")}] y llegó [${a.join(",")}]`;
  }
  return null;
}
