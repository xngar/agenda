"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { DentalChartEntry, DentalFace, DentalState } from "@/lib/ficha/types";
import { aggregateToothState } from "@/lib/ficha/dental";
import { Card, FichaCardHeader, Button, ErrorNotice, Spinner } from "./panels-shared";
import { Modal } from "@/components/motion/modal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

function ToothIcon({ tooth }: { tooth: number }) {
  const position = tooth % 10;

  if (position >= 6) {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 30" className="h-6 w-5 shrink-0">
        <path
          d="M4 3.5c1.6-1.2 3.3-.6 4.4.1 1.1-.7 2.8-1.3 4.3-.2 1.4-1 3.2-.8 4.5.2 1.8 1.4 2.4 4.5 1.7 7.2-.4 1.5-1.3 2.3-2.2 3.1-.9.8-1.5 1.7-1.6 3l-.5 8.2c-.1 1.4-1.9 1.6-2.4.2l-1.6-4.4-1.7 4.4c-.5 1.3-2.2 1-2.3-.4l-.3-8.2c-.1-1.3-.8-2.2-1.7-3-1-.8-1.9-1.7-2.3-3.2-.7-2.7 0-5.6 1.7-7Z"
          fill="white"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path d="M8.4 4.1c-.3 2 .1 3.6 1.2 4.8m6-4.8c.2 2-.2 3.5-1.2 4.7" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    );
  }

  if (position >= 4) {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 30" className="h-6 w-5 shrink-0">
        <path
          d="M7.4 3.1c1.4-.8 2.9-.4 4.1.4 1.4-.8 3-.8 4.3 0 2.2 1.3 2.5 4.2 1.6 6.6-.6 1.6-1.6 2.4-2.7 3.3-.8.7-1.2 1.6-1.3 2.8l-.4 8.8c-.1 1.3-1.8 1.5-2.3.3l-.8-2.2-.7 2.2c-.5 1.3-2.2 1.1-2.3-.3l-.5-8.8c-.1-1.2-.6-2.1-1.4-2.8-1.1-.9-2.1-1.8-2.7-3.4-.8-2.5-.4-5.5 1.8-6.9 1-.6 2.2-.6 3.3 0Z"
          fill="white"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path d="M8.2 4.1c-.2 1.8.2 3.4 1.2 4.8m6.1-4.7c.2 1.8-.2 3.4-1.2 4.7" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    );
  }

  if (position === 3) {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 30" className="h-6 w-5 shrink-0">
        <path
          d="M6.2 3.3c1.8-.8 3.7.1 5.8 1.2 2.1-1.1 4-2 5.8-1.2 2.2.9 2.2 4.2 1.1 6.5-.7 1.5-1.7 2.1-3 2.7-1.4.7-2.3 1.6-2.7 3.2l-1.1 8.9c-.2 1.5-2 1.5-2.2 0l-1.1-8.9c-.4-1.6-1.3-2.5-2.7-3.2-1.3-.6-2.3-1.2-3-2.7-1.1-2.3-1.1-5.6 1.1-6.5Z"
          fill="white"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 30" className="h-6 w-5 shrink-0">
      <path
        d="M8.2 3c1.3-.7 2.6-.3 3.8.4 1.2-.7 2.5-1.1 3.8-.4 2.1 1.2 2.2 4.3 1.2 6.7-.5 1.4-1.2 2.1-2.2 2.8-.9.8-1.3 1.7-1.4 3l-.3 9c-.1 1.4-1.7 1.5-2.2.2l-.9-2.6-.9 2.6c-.5 1.3-2.1 1.2-2.2-.2l-.3-9c-.1-1.3-.5-2.2-1.4-3-1-.7-1.7-1.4-2.2-2.8-1-2.4-.9-5.5 1.2-6.7 1.3-.7 2.6-.3 3.8.4Z"
        fill="white"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OdontogramaPanel({ patientId }: { patientId: string }) {
  const [chart, setChart] = useState<DentalChartEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<string, DentalState>>({});
  const [iniciales, setIniciales] = useState<Record<string, DentalState>>({});
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
        <FichaCardHeader title="Odontograma" />
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
    const estados = toothFaces(tooth).map((f) => estadoDe(tooth, f));
    return aggregateToothState(estados) as DentalState | undefined;
  };

  const desglosePieza = (tooth: number): string => {
    const partes = toothFaces(tooth).flatMap((f) => {
      const estado = estadoDe(tooth, f);
      return estado ? [`${FACE_LABELS[f].toLowerCase()} ${estado}`] : [];
    });
    return partes.length > 0 ? partes.join(" · ") : "sin registro";
  };

  function abrir(tooth: number) {
    // El modal precarga lo guardado: lo que ves es lo que hay.
    const precarga: Record<string, DentalState> = {};
    for (const f of toothFaces(tooth)) {
      const estado = estadoDe(tooth, f);
      if (estado) precarga[f] = estado;
    }
    setSelected(tooth);
    setEdits(precarga);
    setIniciales(precarga);
    setError(null);
  }

  /** Caras que difieren de lo cargado al abrir (vacío = volver a "Sin cambio"). */
  function diferencias(): { face: string; state: DentalState }[] {
    if (!selected) return [];
    const caras = new Set([...Object.keys(edits), ...Object.keys(iniciales)]);
    const cambios: { face: string; state: DentalState }[] = [];
    for (const face of caras) {
      const antes = iniciales[face];
      const ahora = edits[face];
      if (ahora === antes) continue;
      if (!ahora) continue;
      cambios.push({ face, state: ahora });
    }
    return cambios;
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setGuardando(true);
    setError(null);
    try {
      const entries = diferencias().map(({ face, state }) => ({
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
      toast.success("Odontograma actualizado");
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
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max justify-center gap-0.5 sm:gap-1" aria-label={`Dientes ${grupo[0]}–${grupo[grupo.length - 1]}`}>
          {arr.map((t) => {
            const estados = toothFaces(t).map((face) => estadoDe(t, face));
            const c =
              estadoPieza(t) ??
              (estados.some((estado) => estado === "sana") ? "sana" : undefined);
            const className = c ? COLORS[c] : "bg-neutral-100 text-neutral-500 hover:bg-action-primary/10";
            return (
              <Tooltip key={t}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => abrir(t)}
                    className={`flex h-12 w-9 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-bold transition-colors sm:w-10 sm:text-xs ${className}`}
                    aria-label={`Pieza ${t}: ${desglosePieza(t)}`}
                  >
                    <ToothIcon tooth={t} />
                    {t}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm space-y-1 rounded-lg px-3 py-2 text-left text-sm">
                  <p className="font-semibold">Pieza {t}</p>
                  <p className="font-normal">{desglosePieza(t)}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
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

      <Card>
        <FichaCardHeader
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

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        ariaLabel={selected ? `Pieza ${selected}` : "Pieza dental"}
        size="2xl"
        panelClassName="p-0 border-neutral-200 shadow-card"
        busy={guardando}
      >
        {selected !== null ? (
          <>
            <FichaCardHeader title={`Pieza ${selected}`} description="Se muestran los valores guardados. Cambia sólo las caras a registrar; se guarda únicamente lo que difiere." />
            <form onSubmit={guardar} className="space-y-3 px-5 py-5">
              {error ? <ErrorNotice message={error} /> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                {toothFaces(selected).map((face) => (
                  <label key={face} className="block">
                    <span className="mb-1 block text-xs font-medium text-neutral-600">
                      {FACE_LABELS[face]}
                    </span>
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
                <Button type="submit" disabled={guardando || diferencias().length === 0}>
                  {guardando ? "Guardando…" : "Guardar caras"}
                </Button>
                <Button variant="ghost" onClick={() => setSelected(null)} disabled={guardando}>Cancelar</Button>
              </div>
            </form>
          </>
        ) : null}
      </Modal>
    </div>
  );
}