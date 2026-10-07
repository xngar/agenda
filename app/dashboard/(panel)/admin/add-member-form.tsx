"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const inputCls =
  "w-full min-h-11 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-brand-navy focus:outline-none";
const labelCls = "block text-sm font-medium text-neutral-700";
const primaryBtn =
  "inline-flex min-h-9 items-center rounded-xl bg-brand-navy px-4 text-sm font-semibold text-white hover:bg-brand-navy-700 disabled:cursor-not-allowed disabled:opacity-60";
const ghostBtn =
  "inline-flex min-h-9 items-center rounded-xl border border-neutral-300 px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-100";

/**
 * Alta de miembros del equipo, sólo visible para administradores.
 *
 * La cuenta nace con contraseña temporal (igual que el administrador que
 * crea la organización desde la plataforma): la comparte la persona que
 * administra por un canal seguro, y la nueva puede cambiarla después.
 * El servidor fija `org_id` desde la sesión, nunca desde este formulario.
 */
export function AddMemberForm() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [rol, setRol] = useState<"professional" | "reception">("professional");
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  async function crear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const datos = new FormData(form);

    setError(null);
    setExito(null);
    setEnviando(true);

    try {
      const response = await fetch("/api/dashboard/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: datos.get("fullName"),
          email: datos.get("email"),
          password: datos.get("password"),
          specialty: datos.get("specialty") || undefined,
          role: datos.get("role"),
          isAdmin: datos.get("isAdmin") === "on",
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        doctor?: { full_name?: string };
      };

      if (!response.ok) {
        setError(data.error ?? "No se pudo crear la cuenta");
        return;
      }

      const nombre = data.doctor?.full_name ?? "el nuevo miembro";
      form.reset();
      setRol("professional");
      setAbierto(false);
      setExito(`Se creó la cuenta de ${nombre}. Comparte la contraseña temporal por un canal seguro.`);
      router.refresh();
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-3">
      {exito ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {exito}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {abierto ? (
        <form onSubmit={crear} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="miembro-nombre">
                Nombre completo
              </label>
              <input
                id="miembro-nombre"
                name="fullName"
                required
                minLength={3}
                maxLength={120}
                autoComplete="off"
                className={`${inputCls} mt-1`}
              />
            </div>

            <div>
              <label className={labelCls} htmlFor="miembro-correo">
                Correo
              </label>
              <input
                id="miembro-correo"
                name="email"
                type="email"
                required
                autoComplete="off"
                className={`${inputCls} mt-1`}
              />
            </div>

            <div>
              <label className={labelCls} htmlFor="miembro-clave">
                Contraseña temporal
              </label>
              <input
                id="miembro-clave"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={`${inputCls} mt-1`}
              />
              <p className="mt-1 text-xs text-neutral-500">
                Mínimo 8 caracteres. Compártela con la persona por un canal seguro.
              </p>
            </div>

            <div>
              <label className={labelCls} htmlFor="miembro-rol">
                Rol
              </label>
              <select
                id="miembro-rol"
                name="role"
                value={rol}
                onChange={(e) => setRol(e.target.value as typeof rol)}
                className={`${inputCls} mt-1`}
              >
                <option value="professional">Profesional</option>
                <option value="reception">Recepción</option>
              </select>
            </div>

            {rol === "professional" ? (
              <div>
                <label className={labelCls} htmlFor="miembro-especialidad">
                  Especialidad
                </label>
                <input
                  id="miembro-especialidad"
                  name="specialty"
                  maxLength={80}
                  autoComplete="off"
                  placeholder="Opcional"
                  className={`${inputCls} mt-1`}
                />
              </div>
            ) : null}
          </div>

          <label className="flex items-start gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              name="isAdmin"
              className="mt-1 h-4 w-4 rounded border-neutral-300"
            />
            <span>
              Puede administrar el equipo
              <span className="block text-xs text-neutral-500">
                Agregar miembros y activar o desactivar cuentas.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={enviando} className={primaryBtn}>
              {enviando ? "Creando…" : "Crear miembro"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAbierto(false);
                setError(null);
              }}
              className={ghostBtn}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setAbierto(true)} className={primaryBtn}>
          Agregar miembro
        </button>
      )}

      <p className="sr-only" aria-live="polite">
        {enviando ? "Creando la cuenta del miembro" : ""}
      </p>
    </div>
  );
}
