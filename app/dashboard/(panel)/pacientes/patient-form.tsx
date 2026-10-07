"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, inputClasses } from "@/components/ui";

interface PatientDraft {
  id?: string;
  full_name?: string | null;
  rut?: string | null;
  phone?: string | null;
  email?: string | null;
  birth_date?: string | null;
  sex?: string | null;
}

function normalizeRut(raw: string): string {
  return raw.replace(/[^0-9Kk]/g, "").toUpperCase();
}

export function PatientFormModal({
  open,
  initial = null,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial?: PatientDraft | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [rut, setRut] = useState(initial?.rut ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [birthDate, setBirthDate] = useState(initial?.birth_date?.slice(0, 10) ?? "");
  const [sex, setSex] = useState(initial?.sex ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const editing = Boolean(initial?.id);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const body: Record<string, unknown> = {
      full_name: fullName.trim(),
      phone: phone.trim() || "",
      email: email.trim() || null,
      birth_date: birthDate || null,
      sex: sex || null,
    };
    if (rut.trim()) body.rut = normalizeRut(rut);

    try {
      const url = editing ? `/api/ficha/patients/${initial?.id}` : "/api/ficha/patients";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? "No se pudo guardar el paciente");
        return;
      }

      if (editing) {
        onSaved?.();
        router.refresh();
      } else {
        router.push(`/dashboard/pacientes/${data.patient.id}`);
        router.refresh();
      }
    } catch {
      setError("Error de conexión, intenta de nuevo");
    } finally {
      setSaving(false);
    }
  }

  const label = "mb-1 block text-xs font-medium text-neutral-600";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Editar paciente" : "Nuevo paciente"}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-brand-navy">
          {editing ? "Editar paciente" : "Nuevo paciente"}
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          {editing
            ? "Se guardará en tu lista de pacientes."
            : "El paciente quedará asociado a tu cuenta; el resto del equipo podrá verlo."}
        </p>

        <form onSubmit={guardar} className="mt-4 space-y-3">
          <label className="block">
            <span className={label}>Nombre completo</span>
            <input
              className={inputClasses}
              required
              minLength={2}
              maxLength={120}
              value={fullName}
              placeholder="P. ej. Carla Muñoz"
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={label}>RUT</span>
              <input
                className={inputClasses}
                value={rut}
                placeholder="12.345.678-9"
                maxLength={16}
                onChange={(e) => setRut(e.target.value)}
              />
            </label>
            <label className="block">
              <span className={label}>Teléfono</span>
              <input
                className={inputClasses}
                value={phone}
                placeholder="+56 9 1234 5678"
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Correo</span>
              <input
                className={inputClasses}
                type="email"
                value={email}
                placeholder="paciente@correo.cl"
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block">
              <span className={label}>Fecha de nacimiento</span>
              <input
                className={inputClasses}
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </label>
          </div>

          <label className="block">
            <span className={label}>Sexo</span>
            <select className={inputClasses} value={sex} onChange={(e) => setSex(e.target.value)}>
              <option value="">Sin especificar</option>
              <option value="female">Mujer</option>
              <option value="male">Hombre</option>
              <option value="other">Otro</option>
              <option value="undisclosed">Prefiere no decir</option>
            </select>
          </label>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear paciente"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function NewPatientButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Nuevo paciente</Button>
      <PatientFormModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}