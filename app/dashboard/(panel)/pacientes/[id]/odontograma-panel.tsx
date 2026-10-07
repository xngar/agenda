"use client";

import { useCallback, useEffect, useState } from "react";
import type { DentalChartEntry, DentalFace, DentalState } from "@/lib/ficha/types";
import { Card, CardHeader, Button, ErrorNotice, InfoNotice, Spinner, modalClasses } from "./panels-shared";

const STATES: { value: DentalState; label: string }[] = [
  { value: "sana", label: "Sana" },
  { value: "caries", label: "Caries" },
  { value: "obturada", label: "Obturada" },
  { value: "fractura", label: "Fractura" },
  { value: "desgaste", label: "Desgaste" },
  { value: "sellante", label: "Sellante" },
  { value: "endodoncia", label: "Endodoncia" },
  { value: "corona", label: "Corona" },
  { value: "puente", label: "Puente" },
  { value: "implante", label: "Implante" },
  { value: "ausente", label: "Ausente" },
  { value: "por_extraer", label: "Por extraer" },
  { value: "extraida", label: "Extraída" },
  { value: "incluida", label: "Incluida" },
];

const COLORS: Record<DentalState, string> = {
  sana: "bg-lime-200 text-lime-900",
  caries: "bg-orange-300 text-orange-950",
  obturada: "bg-sky-200 text-sky-900",
  fractura: "bg-amber-200 text-amber-900",
  desgaste: "bg-yellow-200 text-yellow-900",
  sellante: "bg-teal-200 text-teal-900",
  endodoncia: "bg-purple-300 text-purple-950",
  corona: "bg-fuchsia-200 text-fuchsia-900",
  puente: "bg-indigo-200 text-indigo-900",
  implante: "bg-cyan-200 text-cyan-900",
  ausente: "bg-neutral-300 text-neutral-700",
  por_extraer: "bg-red-200 text-red-900",
  extraida: "bg-neutral-400 text-neutral-800",
  incluida: "bg-stone-300 text-stone-800",
  protesis_removible: "bg-green-200 text-green-900",
};

const FACE_LABELS: Record<DentalFace, string> = {
  vestibular: "Vestibular",
  lingual: "Lingual",
  mesial: "Mesial",
  distal: "Distal",
  occlusal: "Oclusal",
  incisal: "Incisal",
};

function toothFaces(tooth: number): DentalFace[] {
  const base: DentalFace[] = ["mesial", "distal", "vestibular", "lingual"];
  return tooth >= 11 && tooth <= 48 ? [...base, "occlusal"] : [...base, "incisal"];
}

export function OdontogramaPanel({ patientId }: { patientId: string }) {
  const [chart, setChart] = useState<DentalChartEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<string, DentalState>>({});
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const response = await fetch(`/api/ficha/patients/${patientId}/chart`);
      const data = (await response.json()) as { chart?: DentalChartEntry[]; error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo cargar el odontograma");
        return;
      }
      setChart(data.chart ?? []);
    } catch {
      setError("No pudimos conectarnos.");
    }
  }, [patientId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, setState tras await
    cargar();
  }, [cargar]);

  if (chart === null) {
    return (
      <Card>
        <CardHeader title="Odontograma" />
        <div className="px-5 py-8">
          <Spinner label="Cargando odontograma…" />
        </div>
      </Card>
    );
  }

  const estadoDe = (tooth: number, face: string): DentalState | undefined => {
    const e = chart.find((c) => c.tooth === tooth && c.face === face);
    return e?.state;
  };

  const estadoPieza = (tooth: number): DentalState | undefined => {
    const faces = toothFaces(tooth);
    if (faces.some((f) => estadoDe(tooth, f) === "extraida")) return "extraida";
    if (faces.some((f) => estadoDe(tooth, f) === "ausente")) return "ausente";
    if (faces.some((f) => estadoDe(tooth, f) === "caries")) return "caries";
    if (faces.length && faces.every((f) => estadoDe(tooth, f) === "sana")) return "sana";
    return undefined;
  };

  function abrir(tooth: number) {
    setSelected(tooth);
    setEdits({});
    setError(null);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      const entries = Object.entries(edits).map(([face, state]) => ({
        tooth: selected,
        face,
        state,
      }));
      if (!entries.length) {
        setSelected(null);
        setGuardando(false);
        return;
      }
      const response = await fetch(`/api/ficha/patients/${patientId}/chart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar el odontograma");
        return;
      }
      setAviso("Odontograma actualizado.");
      setSelected(null);
      cargar();
    } catch {
      setError("No pudimos conectarnos.");
    } finally {
      setGuardando(false);
    }
  }

  const fila = (grupo: number[], reverse = false) => {
    const arr = reverse ? [...grupo].reverse() : grupo;
    return (
      <div className="flex justify-center gap-1" aria-label={`Dientes ${grupo[0]}–${grupo[grupo.length - 1]}`}>
        {arr.map((t) => {
          const c = estadoPieza(t);
          const className = c ? COLORS[c] : "bg-neutral-100 text-neutral-500 hover:bg-brand-sky-100";
          return (
            <button
              key={t}
              type="button"
              onClick={() => abrir(t)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold transition-colors ${className}`}
              title={`Pieza ${t}: ${c ?? "sin registro"}`}
            >
              {t}
            </button>
          );
        })}
      </div>
    );
  };

  const superior = [...Array(8)].map((_, i) => 18 - i); // 18..11
  const superiorDer = [...Array(8)].map((_, i) => 21 + i); // 21..28
  const inferior = [...Array(8)].map((_, i) => 41 + i); // 41..48
  const inferiorIzq = [...Array(8)].map((_, i) => 31 - i); // 31..38

  return (
    <div className="space-y-4">
      {error ? <ErrorNotice message={error} /> : null}
      {aviso ? <InfoNotice>{aviso}</InfoNotice> : null}

      <Card>
        <CardHeader
          title="Odontograma"
          description="Haz clic en una pieza para registrar el estado de cada cara."
        />
        <div className="space-y-4 px-5 py-6">
          <div className="space-y-1">
            <p className="text-center text-xs font-semibold text-neutral-500">Superior</p>
            {fila([...superior, ...superiorDer])}
          </div>
          <div className="space-y-1">
            <p className="text-center text-xs font-semibold text-neutral-500">Inferior</p>
            {fila([...inferiorIzq, ...inferior])}
          </div>
          <div className="grid grid-cols-2 gap-1 pt-2 text-[11px] text-neutral-600 sm:grid-cols-4 md:grid-cols-7">
            {STATES.map((s) => (
              <span key={s.value} className="flex items-center gap-1.5">
                <span className={`h-3 w-3 rounded ${COLORS[s.value].split(" ")[0]}`} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-neutral-900/40 p-4" onClick={() => setSelected(null)}>
          <div className={modalClasses} onClick={(e) => e.stopPropagation()}>
            <CardHeader title={`Pieza ${selected}`} description="Selecciona el estado de cada cara. Deja una cara sin elegir para no cambiarla." />
            <form onSubmit={guardar} className="space-y-3 px-5 py-5">
              {error ? <ErrorNotice message={error} /> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                {toothFaces(selected).map((face) => (
                  <label key={face} className="block">
                    <span className="mb-1 block text-xs font-medium text-neutral-600">{FACE_LABELS[face]}</span>
                    <select
                      className="w-full min-h-11 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-brand-navy focus:outline-none"
                      value={edits[face] ?? ""}
                      onChange={(e) => {
                        const v = e.target.value as DentalState;
                        setEdits((prev) => {
                          const next = { ...prev };
                          if (v) next[face] = v;
                          else delete next[face];
                          return next;
                        });
                      }}
                    >
                      <option value="">Sin cambio</option>
                      {STATES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <p className="text-xs text-neutral-500">
                {toothFaces(selected).length === 5 ? "Pieza permanente: oclusal" : "Pieza temporal: incisal"} · estado actual:{" "}
                {estadoPieza(selected) ?? "sin registrar"}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={guardando || Object.keys(edits).length === 0}>
                  {guardando ? "Guardando…" : "Guardar caras"}
                </Button>
                <Button variant="ghost" onClick={() => setSelected(null)} disabled={guardando}>Cancelar</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}