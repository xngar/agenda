"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { Button, inputClasses } from "@/components/ui";
import { Modal } from "@/components/motion/modal";
import { formatPhonePartial, whatsappPhone } from "@/lib/phone";

export function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.05 2C6.495 2 2 6.495 2 12.05c0 1.77.462 3.432 1.27 4.875L2 22l5.207-1.246A10.02 10.02 0 0 0 12.05 22C17.605 22 22.1 17.505 22.1 11.95 22.1 6.495 17.605 2 12.05 2zm0 18.14a8.07 8.07 0 0 1-4.11-1.12l-.295-.175-3.09.74.83-3.02-.19-.31a8.06 8.06 0 0 1-1.24-4.305c0-4.46 3.63-8.09 8.095-8.09 4.46 0 8.09 3.63 8.09 8.09 0 4.46-3.63 8.09-8.09 8.09z" />
    </svg>
  );
}

function primerNombre(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

/**
 * Botón ícono de WhatsApp. Reutilizado por la agenda (día, semana y mes) y el
 * listado de pacientes. Abre `WhatsappModal` con el mensaje editable.
 */
export function WhatsappButton({
  patientId,
  fullName,
  phone,
  orgName,
  compacto = false,
  disabled = false,
}: {
  patientId: string;
  fullName: string;
  phone: string | null;
  orgName: string;
  /** Versión más baja para filas densas, como las acciones de la agenda. */
  compacto?: boolean;
  /** Bloquea el botón mientras la cita está en medio de otra acción. */
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const numero = whatsappPhone(phone);
  const bloqueado = !numero || disabled;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={bloqueado}
        aria-label={
          numero
            ? `Enviar WhatsApp a ${fullName}`
            : `Sin celular registrado para ${fullName}`
        }
        className={`inline-flex shrink-0 items-center justify-center rounded-full border border-success-200 bg-success-50 text-success-700 transition-colors duration-element ease-in-out-soft hover:bg-success-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success-700 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400 ${
          compacto ? "h-8 w-8" : "h-9 w-9"
        }`}
      >
        <WhatsappIcon className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && numero ? (
          <WhatsappModal
            patientId={patientId}
            fullName={fullName}
            phone={phone}
            orgName={orgName}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}

/**
 * Modal de WhatsApp controlado. Se monta sólo mientras está abierto (así el
 * mensaje arranca limpio en cada contacto); los menús de semana y mes lo usan
 * directamente.
 */
export function WhatsappModal({
  patientId,
  fullName,
  phone,
  orgName,
  onClose,
}: {
  patientId: string;
  fullName: string;
  phone: string | null;
  orgName: string;
  onClose: () => void;
}) {
  const numero = whatsappPhone(phone);
  const nombre = primerNombre(fullName);
  const [texto, setTexto] = useState(
    `Hola${nombre ? ` ${nombre}` : ""}, le escribimos de ${orgName}. ¿En qué podemos ayudarle?`,
  );

  if (!numero) return null;

  function registrarContacto() {
    void fetch(`/api/dashboard/patients/${patientId}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: "whatsapp" }),
      keepalive: true,
    }).catch(() => {});
  }

  return (
    <Modal
      onClose={onClose}
      title="Enviar WhatsApp"
      description={`${fullName} · ${formatPhonePartial(phone ?? "")}`}
    >
      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">Mensaje</span>
        <textarea
          className={`${inputClasses} min-h-28 resize-y`}
          value={texto}
          maxLength={1000}
          autoFocus
          onChange={(e) => setTexto(e.target.value)}
        />
      </label>

      <p className="mt-2 text-xs text-warning-700">
        No compartas diagnósticos, exámenes ni datos clínicos por WhatsApp.
      </p>
      <p className="mt-1 text-xs text-neutral-500">
        Se abrirá WhatsApp con el mensaje listo. Si es tu primera vez en este navegador,
        te pedirá escanear el QR.
      </p>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <a
          href={`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={registrarContacto}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-success-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-success-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success-700"
        >
          <WhatsappIcon className="h-4 w-4" />
          Abrir WhatsApp
        </a>
      </div>
    </Modal>
  );
}
