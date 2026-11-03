"use client";

import { Button, ErrorNotice, Field, inputClasses } from "@/components/ui";
import type { DraftEncounterOption } from "./draft-encounters";

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}-${month}-${year}` : value;
}

export function DraftEncounterField({
  id,
  encounters,
  value,
  onChange,
  onCrear,
  creando,
  error,
  sinBorradoresTexto,
}: {
  id: string;
  encounters: DraftEncounterOption[] | null;
  value: string;
  onChange: (encounterId: string) => void;
  onCrear: () => void;
  creando: boolean;
  error: string | null;
  sinBorradoresTexto: string;
}) {
  const sinBorradores = encounters !== null && encounters.length === 0;

  return (
    <div className="space-y-2">
      <Field
        label="Atención en borrador"
        htmlFor={id}
        hint="Solo puedes asociar registros a atenciones en borrador propias. Las firmadas son inmutables."
      >
        <select
          id={id}
          className={inputClasses}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={encounters === null || sinBorradores}
          required
        >
          <option value="">
            {encounters === null
              ? "Cargando atenciones…"
              : sinBorradores
                ? "Sin atenciones en borrador"
                : "Selecciona una atención"}
          </option>
          {(encounters ?? []).map((encounter) => (
            <option key={encounter.id} value={encounter.id}>
              {formatDate(encounter.started_at)} · {encounter.care_type || "Atención"}
              {encounter.doctors?.full_name ? ` · ${encounter.doctors.full_name}` : ""}
            </option>
          ))}
        </select>
      </Field>

      {sinBorradores ? (
        <div className="space-y-2 rounded-xl border border-warning-200 bg-warning-50 p-3">
          <p className="text-sm text-warning-800">{sinBorradoresTexto}</p>
          <Button type="button" size="sm" variant="secondary" onClick={onCrear} disabled={creando}>
            {creando ? "Creando…" : "Crear atención en borrador"}
          </Button>
        </div>
      ) : encounters && encounters.length > 0 ? (
        <p className="text-xs text-neutral-500">
          Los cambios quedarán asociados a esta atención en borrador.
        </p>
      ) : null}

      {error ? <ErrorNotice message={error} /> : null}
    </div>
  );
}
