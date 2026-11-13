"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CalendarCheck, Check, ShieldCheck, X } from "lucide-react";
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
      ? "group inline-flex w-full items-center justify-between gap-3 rounded-xl py-0.5 text-left text-sm font-semibold text-action-primary focus-visible:outline-2 focus-visible:outline-action-primary cursor-pointer"
      : variant === "nav"
        ? "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--lp-sky-200)] bg-sky-50/80 px-3.5 py-2 text-sm font-semibold text-[var(--lp-navy)] transition-all duration-micro hover:border-sky-300 hover:bg-[var(--lp-sky-100)] active:scale-[0.98] cursor-pointer md:min-h-9"
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
            <CalendarCheck className="h-4 w-4 shrink-0 text-[var(--lp-blue)]" aria-hidden="true" />
            <span>¿Ya tienes cita? Gestionar o cancelar</span>
          </>
        )}
      </button>

      {isOpen && portalTarget
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
              onClick={() => !loading && setIsOpen(false)}
            >
              <div
                className="anim-modal-in relative m-auto w-full max-w-lg rounded-2xl border border-[var(--lp-sky-200)] bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => !loading && setIsOpen(false)}
                  disabled={loading}
                  className="absolute top-3.5 right-3.5 inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 cursor-pointer"
                  aria-label="Cerrar ventana"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>

                <div className="mb-4 flex items-center gap-3 pr-10">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--lp-sky-100)] text-action-primary">
                    <CalendarCheck className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 id="modal-title" className="text-xl font-bold text-[var(--lp-navy)]">
                      Gestionar o cancelar cita
                    </h2>
                    <p className="text-xs text-neutral-500">
                      {clinicName ? clinicName : "Clínica"} · Agenda online
                    </p>
                  </div>
                </div>

                <p className="mb-5 text-sm leading-relaxed text-neutral-600">
                  Ingresa tu <strong>RUT</strong> y <strong>correo electrónico</strong> para ver, reprogramar o cancelar tu hora.
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
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                        <div>
                          <p className="text-sm font-semibold text-neutral-900">{success}</p>
                          {redirecting && (
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-600">
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
                      <label htmlFor="lookup-rut" className="mb-1 block text-sm font-semibold text-neutral-800">
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
                    </div>

                    <div>
                      <label htmlFor="lookup-email" className="mb-1 block text-sm font-semibold text-neutral-800">
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
                    </div>

                    <div className="flex items-start gap-2.5 rounded-xl border border-[var(--lp-sky-200)]/80 bg-sky-50/50 p-3.5 text-xs text-neutral-700">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-action-primary" aria-hidden="true" />
                      <p className="leading-relaxed">
                        Con ambos datos accedes al instante. Si sólo ingresas uno, te enviaremos un enlace seguro a tu correo.
                      </p>
                    </div>

                    <div className="flex flex-col-reverse items-center justify-end gap-2.5 pt-2 sm:flex-row">
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
                        className="w-full min-w-36 sm:w-auto"
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
