"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, buttonClasses, inputClasses } from "@/components/ui";
import { AsyncButton } from "@/components/motion/async-button";
import { Modal } from "@/components/motion/modal";
import { formatRutPartial, normalizeRut } from "@/lib/rut";
import { formatPhonePartial, normalizePhone } from "@/lib/phone";

interface PatientDraft {
  id?: string;
  full_name?: string | null;
  rut?: string | null;
  phone?: string | null;
  email?: string | null;
  birth_date?: string | null;
  sex?: string | null;
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
  const [rut, setRut] = useState(formatRutPartial(initial?.rut ?? ""));
  const [phone, setPhone] = useState(formatPhonePartial(initial?.phone ?? ""));
  const [email, setEmail] = useState(initial?.email ?? "");
  const [birthDate, setBirthDate] = useState(initial?.birth_date?.slice(0, 10) ?? "");
  const [sex, setSex] = useState(initial?.sex ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- resincroniza el formulario al abrir con datos frescos */
  useEffect(() => {
    if (open) {
      setFullName(initial?.full_name ?? "");
      setRut(formatRutPartial(initial?.rut ?? ""));
      setPhone(formatPhonePartial(initial?.phone ?? ""));
      setEmail(initial?.email ?? "");
      setBirthDate(initial?.birth_date?.slice(0, 10) ?? "");
      setSex(initial?.sex ?? "");
      setError(null);
    }
  }, [open, initial]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const editing = Boolean(initial?.id);

  function handleRutChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { value, selectionStart } = event.target;
    const atEnd = selectionStart === null || selectionStart === value.length;
    setRut(atEnd ? formatRutPartial(value) : value);
  }

  function handleRutBlur() {
    setRut((v) => formatRutPartial(v));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const body: Record<string, unknown> = {
      full_name: fullName.trim(),
      phone: normalizePhone(phone),
      email: email.trim() || null,
      birth_date: birthDate || null,
      sex: sex || null,
    };
    if (normalizeRut(rut)) body.rut = normalizeRut(rut);

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
        toast.success("Paciente actualizado");
        onSaved?.();
        router.refresh();
      } else {
        toast.success("Paciente creado");
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
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar paciente" : "Nuevo paciente"}
      description={
        editing
          ? "Se guardará en tu lista de pacientes."
          : "El paciente quedará asociado a tu cuenta; el resto del equipo podrá verlo."
      }
    >
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
                    inputMode="text"
                    onChange={handleRutChange}
                    onBlur={handleRutBlur}
            />
          </label>
          <label className="block">
            <span className={label}>Teléfono</span>
            <input
              className={inputClasses}
              value={phone}
              placeholder="+56 9 1234 5678"
              inputMode="tel"
              onChange={(e) => setPhone(formatPhonePartial(e.target.value))}
            />
            <span className="mt-1 block text-xs text-neutral-500">
              Escribe sólo el número: el +56 ya está puesto.
            </span>
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

        {error ? <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p> : null}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <AsyncButton
            type="submit"
            loading={saving}
            pendingLabel="Guardando paciente"
            className={buttonClasses("primary", "md")}
          >
            {editing ? "Guardar cambios" : "Crear paciente"}
          </AsyncButton>
        </div>
      </form>
    </Modal>
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