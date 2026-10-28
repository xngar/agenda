"use client";

import type { FieldDef, SectionDef } from "@/lib/ficha/dental";
import { Field, inputClasses } from "@/components/ui";

export type SpecialtyValues = Record<string, unknown>;

function texto(valor: unknown, field?: FieldDef): string | null {
  if (valor === undefined || valor === null) return null;
  if (field?.options && typeof valor === "string") {
    return field.options.find((option) => option.value === valor)?.label ?? valor;
  }
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (typeof valor === "number") return Number.isFinite(valor) ? String(valor) : null;
  if (Array.isArray(valor)) {
    const s = valor.map((v) => String(v).trim()).filter(Boolean).join(", ");
    return s ? s : null;
  }
  const s = String(valor).trim();
  return s ? s : null;
}

/**
 * Lectura de una sección de especialidad: sólo muestra campos con valor.
 */
export function SpecialtyView({
  sections,
  data,
}: {
  sections: SectionDef[];
  data: SpecialtyValues;
}) {
  const visibles = sections.flatMap((section) =>
    section.fields
      .map((field) => ({ section: section.label, field, valor: texto(data[field.key], field) }))
      .filter((v) => v.valor !== null),
  );

  if (visibles.length === 0) {
    return <p className="px-5 py-4 text-sm text-neutral-500">Sin datos de especialidad registrados.</p>;
  }

  return (
    <dl className="grid gap-4 px-5 py-4 sm:grid-cols-2">
      {visibles.map(({ field, valor }) => (
        <div key={field.key}>
          <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {field.label}
          </dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-sm text-neutral-900">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Edición de una sección de especialidad, campo por campo según `kind`.
 */
export function SpecialtyForm({
  sections,
  value,
  onChange,
  idPrefix,
}: {
  sections: SectionDef[];
  value: SpecialtyValues;
  onChange: (key: string, next: unknown) => void;
  idPrefix: string;
}) {
  return (
    <>
      {sections.map((section) => (
        <fieldset key={section.id}>
          <legend className="mb-3 text-sm font-semibold text-action-primary">{section.label}</legend>
          <div className="grid gap-3 md:grid-cols-2">
            {section.fields.map((field) => (
              <div key={field.key} className={field.kind === "textarea" ? "md:col-span-2" : undefined}>
                <Campo field={field} value={value[field.key]} idPrefix={idPrefix} onChange={onChange} />
              </div>
            ))}
          </div>
        </fieldset>
      ))}
    </>
  );
}

function Campo({
  field,
  value,
  idPrefix,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  idPrefix: string;
  onChange: (key: string, next: unknown) => void;
}) {
  const id = `${idPrefix}-${field.key}`;

  if (field.kind === "checkbox") {
    return (
      <label className="inline-flex items-center gap-2 text-sm font-medium text-neutral-800">
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(field.key, e.target.checked)}
          className="h-4 w-4"
        />
        {field.label}
      </label>
    );
  }

  if (field.kind === "textarea") {
    return (
      <Field label={field.label} htmlFor={id} required={false}>
        <textarea
          id={id}
          rows={3}
          className={inputClasses}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      </Field>
    );
  }

  if (field.kind === "date") {
    return (
      <Field label={field.label} htmlFor={id} required={false}>
        <input
          id={id}
          type="date"
          className={inputClasses}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      </Field>
    );
  }

  if (field.kind === "number") {
    return (
      <Field label={field.label} htmlFor={id} required={false} hint={field.hint}>
        <input
          id={id}
          type="number"
          min={field.key === "durationMinutes" ? 1 : undefined}
          max={field.key === "durationMinutes" ? 240 : undefined}
          step={1}
          className={inputClasses}
          value={typeof value === "number" ? value : ""}
          onChange={(e) =>
            onChange(field.key, e.target.value === "" ? undefined : Number(e.target.value))
          }
        />
      </Field>
    );
  }

  if ((field.kind === "select" || field.kind === "radio") && field.options?.length) {
    return (
      <Field label={field.label} htmlFor={id} required={false}>
        <select
          id={id}
          className={inputClasses}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(field.key, e.target.value)}
        >
          <option value="">—</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  return (
    <Field label={field.label} htmlFor={id} required={false} hint={field.hint}>
      <input
        id={id}
        className={inputClasses}
        placeholder={field.placeholder}
        value={Array.isArray(value) ? value.join(", ") : typeof value === "string" || typeof value === "number" ? String(value) : ""}
        onChange={(e) =>
          onChange(
            field.key,
            field.key === "cie10" ? e.target.value.toUpperCase().replace(/\s+/g, "") : e.target.value,
          )
        }
      />
    </Field>
  );
}
