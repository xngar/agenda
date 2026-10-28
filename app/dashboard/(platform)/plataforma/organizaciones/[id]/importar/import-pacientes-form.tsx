"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, buttonClasses } from "@/components/ui";
import { AsyncButton } from "@/components/motion/async-button";

interface ImportError {
  fila: number;
  campo: string;
  mensaje: string;
}

interface ImportResult {
  ok: true;
  insertados: number;
  duplicados_omitidos: number;
}

// Separador ; para compatibilidad con Excel en Chile
const SEP = ";";

const CSV_HEADERS = [
  "rut", "nombres", "apellido_paterno", "apellido_materno",
  "fecha_nacimiento", "email", "telefono", "sexo",
  "direccion", "comuna", "region",
  "prevision", "fonasa_tramo", "isapre_nombre", "isapre_plan",
  "nacionalidad", "estado_civil", "ocupacion",
  "contacto_emergencia_nombre", "contacto_emergencia_parentesco", "contacto_emergencia_telefono",
  "tutor_nombre", "tutor_rut", "tutor_parentesco", "tutor_telefono",
  "como_llego", "fecha_ingreso", "notas",
].join(SEP);

const CSV_EXAMPLE_ROW = [
  "12345678-9", "Juan Andrés", "Pérez", "González",
  "1985-03-15", "juan@mail.com", "+56912345678", "Masculino",
  "Av. Principal 100", "Providencia", "Región Metropolitana",
  "Fonasa", "B", "", "",
  "Chilena", "Casado", "Ingeniero",
  "María Pérez", "Madre", "+56987654321",
  "", "", "", "",
  "Derivado por médico", "2024-01-10", "Sin observaciones",
].join(SEP);

const CSV_TEMPLATE = [CSV_HEADERS, CSV_EXAMPLE_ROW].join("\r\n");

const FIELD_DESCRIPTIONS: { col: string; desc: string; obligatorio: boolean }[] = [
  { col: "rut", desc: "RUT con dígito verificador (ej: 12345678-9)", obligatorio: true },
  { col: "nombres", desc: "Nombres (ej: Juan Andrés)", obligatorio: true },
  { col: "apellido_paterno", desc: "Apellido paterno", obligatorio: true },
  { col: "apellido_materno", desc: "Apellido materno", obligatorio: false },
  { col: "fecha_nacimiento", desc: "Formato YYYY-MM-DD (ej: 1985-03-15)", obligatorio: false },
  { col: "email", desc: "Correo electrónico", obligatorio: false },
  { col: "telefono", desc: "Teléfono con código de país (ej: +56912345678)", obligatorio: false },
  { col: "sexo", desc: "Masculino / Femenino / Otro", obligatorio: false },
  { col: "direccion", desc: "Dirección completa", obligatorio: false },
  { col: "comuna", desc: "Comuna", obligatorio: false },
  { col: "region", desc: "Región", obligatorio: false },
  { col: "prevision", desc: "Fonasa / Isapre / Particular / Otro", obligatorio: false },
  { col: "fonasa_tramo", desc: "A / B / C / D (solo si previsión es Fonasa)", obligatorio: false },
  { col: "isapre_nombre", desc: "Nombre de la Isapre (ej: Banmédica)", obligatorio: false },
  { col: "isapre_plan", desc: "Plan de la Isapre", obligatorio: false },
  { col: "nacionalidad", desc: "Nacionalidad (ej: Chilena)", obligatorio: false },
  { col: "estado_civil", desc: "Soltero / Casado / Viudo / Divorciado / Otro", obligatorio: false },
  { col: "ocupacion", desc: "Ocupación o profesión", obligatorio: false },
  { col: "contacto_emergencia_nombre", desc: "Nombre del contacto de emergencia", obligatorio: false },
  { col: "contacto_emergencia_parentesco", desc: "Parentesco (ej: Cónyuge, Madre)", obligatorio: false },
  { col: "contacto_emergencia_telefono", desc: "Teléfono del contacto de emergencia", obligatorio: false },
  { col: "tutor_nombre", desc: "Nombre del tutor (menores de edad)", obligatorio: false },
  { col: "tutor_rut", desc: "RUT del tutor", obligatorio: false },
  { col: "tutor_parentesco", desc: "Parentesco del tutor (ej: Padre)", obligatorio: false },
  { col: "tutor_telefono", desc: "Teléfono del tutor", obligatorio: false },
  { col: "como_llego", desc: "Cómo llegó el paciente (ej: Derivado por médico, Web)", obligatorio: false },
  { col: "fecha_ingreso", desc: "Fecha de primera atención en clínica anterior (YYYY-MM-DD)", obligatorio: false },
  { col: "notas", desc: "Notas internas (máx. 1.000 caracteres)", obligatorio: false },
];

function downloadTemplate() {
  const bom = "\uFEFF";
  const blob = new Blob([bom + CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla_pacientes.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportPacientesForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<ImportError[] | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [showFields, setShowFields] = useState(false);

  function reset() {
    setFile(null);
    setErrors(null);
    setResult(null);
    setGlobalError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit() {
    if (!file) return;
    setBusy(true);
    setErrors(null);
    setResult(null);
    setGlobalError(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`/api/platform/organizations/${orgId}/import`, {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: false; errors: ImportError[]; error?: string }
        | ImportResult
        | null;

      if (!data) { setGlobalError("Respuesta inesperada del servidor"); return; }

      if (!res.ok || !data.ok) {
        if ("errors" in data && Array.isArray(data.errors) && data.errors.length > 0) {
          setErrors(data.errors);
        } else {
          setGlobalError(("error" in data && data.error) || "No se pudo completar la importación");
        }
        return;
      }

      setResult(data);
      router.refresh();
    } catch {
      setGlobalError("Error de red al subir el archivo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="1. Descarga y completa la plantilla" />
        <div className="space-y-4 p-5">
          <p className="text-sm text-neutral-600">
            La plantilla incluye <span className="font-medium text-neutral-800">28 columnas</span> que corresponden a todos los
            campos de la ficha demográfica del paciente. Solo{" "}
            <span className="font-medium text-neutral-800">rut, nombres y apellido_paterno</span> son obligatorios; el
            resto se puede dejar vacío.
          </p>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-1">
            <p className="font-semibold">⚠️ Esta migración solo cubre datos demográficos del paciente</p>
            <p>
              El historial de atenciones, odontograma, recetas y tratamientos <span className="font-medium">no se migran
              aquí</span> — requieren archivos adicionales. No deshabilite el sistema anterior de la clínica hasta
              completar la migración clínica.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={downloadTemplate} className={buttonClasses("primary", "md")}>
              Descargar plantilla CSV
            </button>
            <button
              type="button"
              onClick={() => setShowFields((v) => !v)}
              className={buttonClasses("ghost", "sm")}
            >
              {showFields ? "Ocultar" : "Ver"} descripción de columnas
            </button>
          </div>

          {showFields ? (
            <div className="overflow-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[520px] text-xs">
                <thead className="bg-neutral-50 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium text-neutral-700">Columna</th>
                    <th className="px-3 py-2 font-medium text-neutral-700">Descripción</th>
                    <th className="px-3 py-2 font-medium text-neutral-700">¿Obligatorio?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {FIELD_DESCRIPTIONS.map((f) => (
                    <tr key={f.col} className={f.obligatorio ? "bg-amber-50" : "bg-white"}>
                      <td className="px-3 py-2 font-mono text-neutral-800">{f.col}</td>
                      <td className="px-3 py-2 text-neutral-600">{f.desc}</td>
                      <td className="px-3 py-2 text-center">
                        {f.obligatorio ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 font-medium">Sí</span>
                        ) : (
                          <span className="text-neutral-400">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <p className="text-xs text-neutral-500">
            El archivo usa <span className="font-mono font-medium">;</span> como separador (compatible con Excel en
            Chile). Si editas el CSV en Excel, guárdalo como <em>CSV UTF-8 (delimitado por comas)</em> — Excel en Chile
            usará <span className="font-mono">;</span> automáticamente.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="2. Sube el archivo completado" />
        <div className="space-y-4 p-5">
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-neutral-800">Archivo CSV</span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={(e) => { reset(); setFile(e.target.files?.[0] ?? null); }}
              className="block w-full cursor-pointer rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-700 file:mr-3 file:rounded-full file:border-0 file:bg-action-primary file:px-3 file:py-1 file:text-xs file:font-semibold file:text-action-primary-foreground"
            />
            {file ? (
              <span className="text-xs text-neutral-500">
                {file.name} · {(file.size / 1024).toFixed(1)} KB
              </span>
            ) : null}
          </div>

          {globalError ? (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {globalError}
            </p>
          ) : null}

          {errors && errors.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-red-700">
                Se encontraron {errors.length} error{errors.length !== 1 ? "es" : ""}. Corrígelos en el archivo y
                vuelve a subirlo.
              </p>
              <div className="overflow-auto rounded-lg border border-red-200">
                <table className="w-full min-w-[480px] text-xs">
                  <thead className="bg-red-50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium text-red-700">Fila</th>
                      <th className="px-3 py-2 font-medium text-red-700">Columna</th>
                      <th className="px-3 py-2 font-medium text-red-700">Problema</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {errors.slice(0, 50).map((e, i) => (
                      <tr key={i} className="bg-white">
                        <td className="px-3 py-2 text-neutral-600">{e.fila === 0 ? "—" : e.fila}</td>
                        <td className="px-3 py-2 font-mono text-neutral-800">{e.campo}</td>
                        <td className="px-3 py-2 text-neutral-700">{e.mensaje}</td>
                      </tr>
                    ))}
                    {errors.length > 50 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-center text-neutral-500">
                          …y {errors.length - 50} errores más
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {result ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
              <p className="font-semibold">Importación completada ✓</p>
              <p className="mt-1">
                {result.insertados} paciente{result.insertados !== 1 ? "s" : ""} importado
                {result.insertados !== 1 ? "s" : ""} correctamente.
                {result.duplicados_omitidos > 0
                  ? ` ${result.duplicados_omitidos} omitido${result.duplicados_omitidos !== 1 ? "s" : ""} (RUT ya existía en esta organización).`
                  : ""}
              </p>
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <AsyncButton
              disabled={!file || !!result}
              loading={busy}
              pendingLabel="Importando…"
              onClick={handleSubmit}
              className={buttonClasses("primary", "md")}
            >
              Importar pacientes
            </AsyncButton>
            {(errors || result) && !busy ? (
              <button type="button" onClick={reset} className={buttonClasses("ghost", "md")}>
                Subir otro archivo
              </button>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
