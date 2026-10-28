"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { formatRutPartial, isValidRut, normalizeRut } from "@/lib/rut";
import { Button, buttonClasses, inputClasses, Spinner, ErrorNotice, InfoNotice } from "@/components/ui";

interface Props {
  clinicSlug: string;
  clinicName?: string;
  variant?: "primary" | "secondary" | "ghost" | "link" | "nav";
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}

export default function ManageAppointmentModal({
  clinicSlug,
  clinicName,
  variant = "ghost",
  size = "md",
  className = "",
  children,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [rut, setRut] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const rutInputRef = useRef<HTMLInputElement>(null);

  const [portalTarget] = useState<HTMLElement | null>(
    () => (typeof document === "undefined" ? null : document.body),
  );

  // Abrir: resetea el formulario y enfoca el RUT
  function abrir() {
    setError(null);
    setSuccess(null);
    setRedirecting(false);
    setIsOpen(true);
    setTimeout(() => rutInputRef.current?.focus(), 50);
  }

  // Manejo de tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading]);

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRutPartial(e.target.value);
    setRut(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanRut = rut.trim();
    const cleanEmail = email.trim();

    if (!cleanRut && !cleanEmail) {
      setError("Por favor ingresa al menos tu RUT o tu correo electrónico.");
      return;
    }

    if (cleanRut && !isValidRut(cleanRut)) {
      setError("El RUT ingresado no es válido. Revisa los dígitos y el verificador.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/manage/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicSlug,
          rut: cleanRut ? normalizeRut(cleanRut) : undefined,
          email: cleanEmail || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ocurrió un error al buscar tu cita.");
      }

      if (!data.found) {
        setError(data.message || "No encontramos citas activas asociadas a estos datos.");
        setLoading(false);
        return;
      }

      if (data.directAccess && data.manageUrl) {
        setSuccess("¡Cita encontrada! Redirigiendo a tu pantalla de gestión...");
        setRedirecting(true);
        setTimeout(() => {
          try {
            const raw = String(data.manageUrl);
            const target = new URL(raw, window.location.origin);
            if (target.origin !== window.location.origin || !target.pathname.startsWith("/cita/")) {
              setError("Encontramos tu cita, pero el enlace no es válido en este sitio. Intenta de nuevo.");
              setRedirecting(false);
              setLoading(false);
              return;
            }
            router.push(`${target.pathname}${target.search}${target.hash}`);
          } catch {
            setError("Encontramos tu cita, pero no pudimos abrirla. Intenta de nuevo.");
            setRedirecting(false);
            setLoading(false);
          }
        }, 1200);
      } else {
        setSuccess(data.message);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado al conectar con el servidor.");
      setLoading(false);
    }
  };

  const triggerClasses =
    variant === "link"
      ? "inline-flex items-center gap-1.5 text-sm font-semibold text-action-primary hover:underline focus-visible:outline-2 focus-visible:outline-action-primary rounded-md py-1"
      : variant === "nav"
      ? "inline-flex items-center gap-1.5 rounded-lg border border-action-primary/20 bg-action-primary/10 px-3 py-2 text-sm font-medium text-action-primary transition-colors hover:border-action-primary/30 hover:bg-action-primary/15"
      : buttonClasses(variant, size, className);

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className={triggerClasses}
        aria-haspopup="dialog"
      >
        {children ?? (
          <>
            <svg
              className="h-4 w-4 shrink-0 opacity-75"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>¿Ya tienes cita? Gestionar o cancelar</span>
          </>
        )}
      </button>

      {isOpen && portalTarget
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex overflow-y-auto bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
            >
              <div
                className="m-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 relative animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Botón cerrar */}
                <button
                  type="button"
                  onClick={() => !loading && setIsOpen(false)}
                  disabled={loading}
                  className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
                  aria-label="Cerrar ventana"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-sky-100 text-action-primary">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </span>
                  <div>
                    <h2 id="modal-title" className="text-xl font-bold text-action-primary">
                      Gestionar o cancelar cita
                    </h2>
                    <p className="text-xs text-neutral-500">
                      {clinicName ? clinicName : "Clínica"} · Agenda online
                    </p>
                  </div>
                </div>

                <p className="text-sm text-neutral-600 mb-5 leading-relaxed">
                  Ingresa tu <strong>RUT</strong> o tu <strong>correo electrónico</strong> para acceder al detalle de tu hora y poder <strong>reprogramarla o cancelarla</strong>.
                </p>

                {error && (
                  <div className="mb-4">
                    <ErrorNotice message={error} />
                  </div>
                )}

                {success && (
                  <div className="mb-5">
                    <InfoNotice>
                      <div className="flex items-start gap-2.5">
                        <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-neutral-900">{success}</p>
                          {redirecting && (
                            <p className="mt-1 text-xs text-neutral-600 flex items-center gap-1.5">
                              <Spinner label="Cargando tu cita…" />
                            </p>
                          )}
                        </div>
                      </div>
                    </InfoNotice>
                  </div>
                )}

                {!redirecting && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="lookup-rut" className="block text-sm font-semibold text-neutral-800 mb-1">
                        RUT del paciente
                      </label>
                      <input
                        ref={rutInputRef}
                        id="lookup-rut"
                        type="text"
                        value={rut}
                        onChange={handleRutChange}
                        placeholder="12.345.678-9"
                        disabled={loading}
                        className={inputClasses}
                        autoComplete="off"
                      />
                      <p className="mt-1 text-xs text-neutral-500">Sin puntos ni guión también funciona.</p>
                    </div>

                    <div>
                      <label htmlFor="lookup-email" className="block text-sm font-semibold text-neutral-800 mb-1">
                        Correo electrónico
                      </label>
                      <input
                        id="lookup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="paciente@ejemplo.com"
                        disabled={loading}
                        className={inputClasses}
                        autoComplete="email"
                      />
                      <p className="mt-1 text-xs text-neutral-500">
                        El correo que ingresaste al momento de agendar.
                      </p>
                    </div>

                    <div className="rounded-xl bg-neutral-50 p-3.5 border border-neutral-200/80 text-xs text-neutral-600 space-y-1">
                      <p className="font-semibold text-neutral-700">💡 Acceso rápido y seguro:</p>
                      <p>
                        • Si ingresas <strong>RUT y Correo</strong>: entras al instante a la pantalla de tu cita.
                      </p>
                      <p>
                        • Si ingresas sólo uno de ellos: te enviaremos el enlace privado a tu correo para verificar tu identidad.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="md"
                        onClick={() => setIsOpen(false)}
                        disabled={loading}
                        className="w-full sm:w-auto"
                      >
                        Cerrar
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        disabled={loading}
                        className="w-full sm:w-auto min-w-36"
                      >
                        {loading ? <Spinner label="Buscando…" /> : "Buscar mi cita"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>,
            portalTarget,
          )
        : null}
    </>
  );
}
