"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Holiday, PublicDoctor, Service, Slot, SlotWithDoctor } from "@/lib/types";
import { CONSENT_TEXT } from "@/lib/clinic";
import { isValidRut } from "@/lib/rut";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorNotice,
  Field,
  LoadingPanel,
  buttonClasses,
  inputClasses,
} from "@/components/ui";
import Turnstile from "@/components/turnstile";
import WeekdayPicker, { type DayStatus } from "./weekday-picker";

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_TITLES: Record<Step, string> = {
  1: "Servicio",
  2: "Profesional",
  3: "Fecha y hora",
  4: "Tus datos",
  5: "Confirmación",
};

const STEPS: Step[] = [1, 2, 3, 4, 5];

export interface BookingWizardProps {
  services: Service[];
  doctors: PublicDoctor[];
  holidays: Holiday[];
  maxDaysAhead: number;
  minNoticeHours: number;
  cancelMinHours: number;
  clinicName: string;
  clinicSlug: string;
  timezone: string;
  initialServiceId?: string;
}

/**
 * Wizard de reserva del paciente.
 *
 * Importante: acá NO se calcula disponibilidad. Cada vez que el paciente
 * elige un día se pide `/api/slots` y el servidor responde con lo que
 * Postgres dice que está libre. El cliente sólo pinta botones.
 */
export default function BookingWizard(props: BookingWizardProps) {
  const router = useRouter();

  const [step, setStep] = useState<Step>(props.initialServiceId ? 3 : 1);
  const [serviceId, setServiceId] = useState<string | null>(props.initialServiceId ?? null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slotStart, setSlotStart] = useState<string | null>(null);

  const [slots, setSlots] = useState<SlotWithDoctor[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    rut: "",
    phone: "",
    email: "",
    consent: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [turnstileToken, setTurnstileToken] = useState("");
  // Se incrementa para que Turnstile entregue un token nuevo: el anterior
  // ya se gastó al intentar la reserva.
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [manageUrl, setManageUrl] = useState<string | null>(null);
  const [dayStatuses, setDayStatuses] = useState<Record<string, DayStatus>>({});

  const service = useMemo(
    () => props.services.find((s) => s.id === serviceId) ?? null,
    [props.services, serviceId],
  );

  const selectedDoctor = useMemo(
    () => props.doctors.find((d) => d.id === doctorId) ?? null,
    [props.doctors, doctorId],
  );

  /* ---------------------------------------------------------------- */
  /* Carga de horarios                                                 */
  /* ---------------------------------------------------------------- */

  const loadSlots = useCallback(
    async (dayKey: string, options?: { silent?: boolean }) => {
      if (!serviceId) return;

      if (!options?.silent) {
        setSlotsLoading(true);
        setSlotsError(null);
      }

      try {
        const params = new URLSearchParams({
          clinicSlug: props.clinicSlug,
          date: dayKey,
          serviceId,
          doctorId: doctorId ?? "",
        });
        const response = await fetch(`/api/slots?${params.toString()}`, {
          headers: { Accept: "application/json" },
        });
        const data = (await response.json()) as {
          slots?: SlotWithDoctor[];
          closed?: boolean;
          outOfRange?: boolean;
          error?: string;
        };

        if (!response.ok) {
          setSlotsError(data.error ?? "No pudimos cargar los horarios.");
          return;
        }

        setSlots(data.slots ?? []);
        setDayStatuses((prev) => ({
          ...prev,
          [dayKey]: data.closed
            ? { available: false, reason: "Cerrado" }
            : data.slots && data.slots.length > 0
              ? { available: true }
              : { available: false, reason: "Sin horas" },
        }));
      } catch {
        setSlotsError("No pudimos conectar. Revisa tu internet e intenta de nuevo.");
      } finally {
        setSlotsLoading(false);
      }
    },
    [serviceId, doctorId, props.clinicSlug],
  );

  /**
   * Cambiar servicio o profesional invalida los horarios ya cargados: dependen
   * de la duración del servicio y de la agenda de ese profesional. Reseteamos
   * en el manejador del evento, no en un efecto; un `useEffect` que hace
   * `setState` provoca un render extra en cascada en cada cambio.
   */
  function resetAvailability() {
    setSlotStart(null);
    setSlots([]);
    setDayStatuses({});
  }

  function selectService(id: string) {
    setServiceId(id);
    // El servicio puede no.performarse por el profesional anterior, así que
    // se vuelve a "cualquiera disponible".
    setDoctorId(null);
    resetAvailability();
  }

  function selectDoctor(id: string | null) {
    setDoctorId(id);
    resetAvailability();
  }

  /**
   * Al elegir hora NO reseteamos la disponibilidad: la hora pertenece a los
   * horarios que acabamos de mostrar. Si sólo un profesional tiene esa hora
   * lo fijamos (evita un segundo "¿cualquiera disponible?" al reservar); si
   * hay varios, lo dejamos en null para que el servidor asigne el primero.
   */
  function selectSlot(value: string, doctor: string | null) {
    setSlotStart(value);
    setDoctorId(doctor);
  }

  function handleDaySelect(dayKey: string) {
    setDay(dayKey);
    setSlotStart(null);
    void loadSlots(dayKey);
  }

  /* ---------------------------------------------------------------- */
  /* Navegación del wizard                                              */
  /* ---------------------------------------------------------------- */

  function goTo(target: Step) {
    setStep(target);
    setSubmitError(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    const index = STEPS.indexOf(step);
    if (index > 0) goTo(STEPS[index - 1]);
  }

  /* ---------------------------------------------------------------- */
  /* Validación de datos                                                */
  /* ---------------------------------------------------------------- */

  function validateDetails(): boolean {
    const errors: Record<string, string> = {};

    if (form.fullName.trim().length < 3) errors.fullName = "Ingresa tu nombre completo";
    if (!isValidRut(form.rut)) errors.rut = "Revisa el RUT: el dígito verificador no coincide";
    if (form.phone.trim().length < 8) errors.phone = "Ingresa un teléfono válido";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      errors.email = "Ingresa un correo válido";
    }
    if (!form.consent) errors.consent = "Necesitamos tu autorización";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit() {
    if (!serviceId || !slotStart) return;
    if (!validateDetails()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          clinicSlug: props.clinicSlug,
          serviceId,
          doctorId,
          slotStart,
          fullName: form.fullName.trim(),
          rut: form.rut.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          consent: form.consent,
          turnstileToken: turnstileToken || undefined,
        }),
      });

      const data = (await response.json()) as { manageUrl?: string; error?: string; field?: string };

      if (!response.ok || !data.manageUrl) {
        if (data.field) setFieldErrors({ [data.field]: data.error ?? "" });
        setSubmitError(data.error ?? "No pudimos completar la reserva.");
        /*
         * El token de Turnstile es de un solo uso: reenviar el mismo en
         * el reintento haría que Cloudflare rechazara la reserva y el
         * paciente no podría volver a intentarlo nunca.
         */
        setTurnstileReset((n) => n + 1);
        return;
      }

      setManageUrl(data.manageUrl);
      // Por si el paciente vuelve a reservar desde la misma página.
      setTurnstileReset((n) => n + 1);
      goTo(5);
    } catch {
      setSubmitError("No pudimos conectar con el servidor. Intenta en unos minutos.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------------------------------------------------------- */

  const slotsByStart = useMemo(() => groupSlotsByStart(slots), [slots]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-bold text-brand-navy sm:text-3xl">Reservar hora</h1>
      <p className="mt-1.5 text-sm text-neutral-600">
        {props.clinicName} · {props.timezone.replace("_", " ")}
      </p>

      <StepIndicator
        current={step}
        maxReached={step}
        onGo={goTo}
        canJump={(target) =>
          isStepReachable(target, { serviceId, doctorId, day, slotStart })
        }
      />

      <div className="mt-6 space-y-5">
        {step === 1 ? (
          <Card>
            <CardHeader
              title="¿Qué necesitas?"
              description="La duración determina los horarios disponibles."
            />
            <fieldset className="p-5">
              <legend className="sr-only">Servicios disponibles</legend>
              <ul className="space-y-3">
                {props.services.map((option) => (
                  <li key={option.id}>
                    <label
                      className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition-colors ${
                        serviceId === option.id
                          ? "border-brand-navy bg-brand-navy-50"
                          : "border-neutral-300 hover:border-brand-navy-300 hover:bg-brand-navy-50/40"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <input
                          type="radio"
                          name="servicio"
                          value={option.id}
                          checked={serviceId === option.id}
                          onChange={() => selectService(option.id)}
                          className="h-4 w-4 shrink-0 accent-[#0B3C7A]"
                        />
                        <span className="min-w-0">
                          <span className="block font-semibold text-neutral-800">{option.name}</span>
                          <span className="block text-sm text-neutral-600">
                            {option.duration_min} minutos
                          </span>
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <WizardNav
                onBack={back}
                nextLabel="Elegir profesional"
                nextDisabled={!serviceId}
                onNext={() => goTo(2)}
              />
            </fieldset>
          </Card>
        ) : null}

        {step === 2 ? (
          <Card>
            <CardHeader
              title="¿Con quién prefieres?"
              description="Si no prefieres a alguien en particular, eliges el primer profesional libre."
              action={
                <button
                  type="button"
                  onClick={() => selectDoctor(null)}
                  className="text-sm font-semibold text-brand-navy underline underline-offset-4"
                >
                  {doctorId ? "Cambiar" : "Cualquiera disponible"}
                </button>
              }
            />
            <fieldset className="p-5">
              <legend className="sr-only">Profesionales</legend>
              <ul className="space-y-3">
                <li>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 ${
                      doctorId === null
                        ? "border-brand-navy bg-brand-navy-50"
                        : "border-neutral-300 hover:border-brand-navy-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="profesional"
                      checked={doctorId === null}
                      onChange={() => selectDoctor(null)}
                      className="h-4 w-4 shrink-0 accent-[#0B3C7A]"
                    />
                    <span>
                      <span className="block font-semibold text-neutral-800">
                        Cualquiera disponible
                      </span>
                      <span className="block text-sm text-neutral-600">
                        Te mostramos la hora más temprana con algún profesional libre
                      </span>
                    </span>
                  </label>
                </li>
                {props.doctors.map((doc) => (
                  <li key={doc.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 ${
                        doctorId === doc.id
                          ? "border-brand-navy bg-brand-navy-50"
                          : "border-neutral-300 hover:border-brand-navy-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="profesional"
                        checked={doctorId === doc.id}
                        onChange={() => selectDoctor(doc.id)}
                        className="h-4 w-4 shrink-0 accent-[#0B3C7A]"
                      />
                      <span>
                        <span className="block font-semibold text-neutral-800">{doc.full_name}</span>
                        {doc.specialty ? (
                          <span className="block text-sm text-neutral-600">{doc.specialty}</span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <WizardNav onBack={back} nextLabel="Elegir fecha y hora" onNext={() => goTo(3)} />
            </fieldset>
          </Card>
        ) : null}

        {step === 3 ? (
          <Card>
            <CardHeader
              title="Elige día y hora"
              description={
                service
                  ? `${service.name} · ${service.duration_min} min${selectedDoctor ? ` · ${selectedDoctor.full_name}` : " · primer profesional libre"}`
                  : undefined
              }
            />
            <div className="space-y-5 p-5">
              <WeekdayPicker
                holidays={props.holidays}
                maxDaysAhead={props.maxDaysAhead}
                minNoticeHours={props.minNoticeHours}
                selected={day}
                statuses={dayStatuses}
                onSelect={handleDaySelect}
              />

              {!day ? (
                <EmptyState
                  title="Primero elige un día"
                  description="Los domingos, feriados y días sin horas aparecen desactivados."
                />
              ) : slotsLoading ? (
                <LoadingPanel label="Buscando horarios…" />
              ) : slotsError ? (
                <ErrorNotice message={slotsError} />
              ) : slots.length === 0 ? (
                <EmptyState
                  title="No hay horas ese día"
                  description="Prueba con otra fecha: puede que el día esté completo o bloqueado."
                  action={
                    <Button variant="secondary" size="sm" onClick={() => void loadSlots(day)}>
                      Buscar de nuevo
                    </Button>
                  }
                />
              ) : (
                <SlotGrid
                  slots={slotsByStart}
                  selected={slotStart}
                  onSelect={selectSlot}
                />
              )}

              <WizardNav
                onBack={back}
                nextLabel="Continuar"
                nextDisabled={!slotStart}
                onNext={() => goTo(4)}
              />
            </div>
          </Card>
        ) : null}

        {step === 4 ? (
          <Card>
            <CardHeader
              title="Tus datos"
              description="Los usamos sólo para gestionar esta cita."
            />
            <form
              className="space-y-5 p-5"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              {submitError ? <ErrorNotice message={submitError} /> : null}

              <Field label="Nombre completo" htmlFor="fullName" error={fieldErrors.fullName}>
                <input
                  id="fullName"
                  name="name"
                  autoComplete="name"
                  className={inputClasses}
                  value={form.fullName}
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="RUT"
                  htmlFor="rut"
                  error={fieldErrors.rut}
                  hint="Sin puntos ni guiones: 123456789"
                >
                  <input
                    id="rut"
                    name="rut"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="12345678-9"
                    className={inputClasses}
                    value={form.rut}
                    aria-invalid={Boolean(fieldErrors.rut)}
                    onChange={(e) => setForm((f) => ({ ...f, rut: e.target.value }))}
                  />
                </Field>

                <Field label="Teléfono" htmlFor="phone" error={fieldErrors.phone} hint="Con código de país, por ejemplo +56912345678">
                  <input
                    id="phone"
                    name="tel"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+56912345678"
                    className={inputClasses}
                    value={form.phone}
                    aria-invalid={Boolean(fieldErrors.phone)}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </Field>
              </div>

              <Field label="Correo electrónico" htmlFor="email" error={fieldErrors.email} hint="Ahí te enviamos la confirmación y el enlace para cambiar tu cita">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@correo.cl"
                  className={inputClasses}
                  value={form.email}
                  aria-invalid={Boolean(fieldErrors.email)}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </Field>

              <div className="space-y-1.5">
                <div className="flex gap-2.5">
                  <input
                    id="consent"
                    name="consent"
                    type="checkbox"
                    checked={form.consent}
                    aria-invalid={Boolean(fieldErrors.consent)}
                    aria-describedby="consent-text"
                    onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))}
                    className="mt-1 h-4 w-4 shrink-0 accent-[#0B3C7A]"
                  />
                  <label htmlFor="consent" className="text-sm text-neutral-700">
                    {CONSENT_TEXT}
                  </label>
                </div>
                {fieldErrors.consent ? (
                  <p className="text-sm font-medium text-brand-navy-900">{fieldErrors.consent}</p>
                ) : null}
              </div>

              <Turnstile onToken={setTurnstileToken} resetKey={turnstileReset} />

              <div className="rounded-card border border-neutral-200 bg-neutral-50 p-4">
                <h3 className="text-sm font-semibold text-brand-navy">Resumen</h3>
                <dl className="mt-2 space-y-1.5 text-sm">
                  <SummaryRow label="Servicio" value={service?.name ?? "—"} />
                  <SummaryRow
                    label="Profesional"
                    value={selectedDoctor?.full_name ?? "Cualquiera disponible"}
                  />
                  <SummaryRow label="Fecha y hora" value={slotSummary(slotStart, day, props.timezone)} />
                </dl>
                <p className="mt-3 text-xs text-neutral-600">
                  Puedes cancelar sin costo hasta {props.cancelMinHours} horas antes de tu cita.
                </p>
              </div>

              <WizardNav
                onBack={back}
                nextLabel={submitting ? "Reservando…" : "Confirmar reserva"}
                nextDisabled={submitting}
                onNext={() => void submit()}
                type="submit"
              />
            </form>
          </Card>
        ) : null}

        {step === 5 && manageUrl ? (
          <Card className="p-6 text-center sm:p-8">
            <span
              aria-hidden="true"
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-navy text-white"
            >
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.4}>
                <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h2 className="mt-4 text-xl font-bold text-brand-navy">¡Cita reservada!</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-neutral-700">
              Te enviamos la confirmación a <strong>{form.email}</strong> con un archivo para tu
              calendario y un enlace para ver, reprogramar o cancelar.
            </p>

            <dl className="mx-auto mt-5 max-w-sm space-y-1.5 rounded-card bg-neutral-50 p-4 text-left text-sm">
              <SummaryRow label="Servicio" value={service?.name ?? "—"} />
              <SummaryRow
                label="Profesional"
                value={selectedDoctor?.full_name ?? "El profesional asignado"}
              />
              <SummaryRow label="Fecha y hora" value={slotSummary(slotStart, day, props.timezone)} />
            </dl>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  window.location.href = manageUrl;
                }}
              >
                Ver mi cita
              </Button>
              <Link
                href="/"
                className={buttonClasses("secondary", "lg")}
                onClick={() => router.push("/")}
              >
                Volver al inicio
              </Link>
            </div>
            <p className="mt-4 text-xs text-neutral-500">
              Si no llega el correo, revisa la carpeta de correo no deseado.
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Piezas                                                               */
/* ------------------------------------------------------------------ */

function StepIndicator({
  current,
  onGo,
  canJump,
}: {
  current: Step;
  maxReached: Step;
  onGo: (step: Step) => void;
  canJump: (step: Step) => boolean;
}) {
  return (
    <nav aria-label="Pasos de la reserva" className="mt-5">
      <ol className="flex items-center gap-1.5 sm:gap-3">
        {STEPS.map((step, index) => {
          const state =
            step === current ? "actual" : step < current ? "hecho" : "pendiente";
          const clickable = canJump(step) && step !== current;

          return (
            <li key={step} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
              <button
                type="button"
                onClick={() => clickable && onGo(step)}
                disabled={!clickable}
                aria-current={state === "actual" ? "step" : undefined}
                className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-lg py-1 text-left sm:gap-2 ${
                  clickable ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    state === "actual"
                      ? "bg-brand-navy text-white"
                      : state === "hecho"
                        ? "bg-brand-sky text-brand-navy-900"
                        : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {state === "hecho" ? "✓" : step}
                </span>
                <span
                  className={`hidden truncate text-xs font-medium sm:block ${
                    state === "actual" ? "text-brand-navy" : "text-neutral-600"
                  }`}
                >
                  {STEP_TITLES[step]}
                </span>
              </button>
              {index < STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={`hidden h-px w-4 sm:block ${
                    step < current ? "bg-brand-sky" : "bg-neutral-200"
                  }`}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function WizardNav({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  type = "button",
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-2.5 border-t border-neutral-200 pt-5 sm:flex-row sm:justify-between">
      <Button variant="ghost" onClick={onBack} type="button">
        Volver
      </Button>
      <Button variant="primary" onClick={onNext} disabled={nextDisabled} type={type}>
        {nextLabel}
      </Button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="text-neutral-600 sm:w-28 sm:shrink-0">{label}</dt>
      <dd className="font-medium text-neutral-800">{value}</dd>
    </div>
  );
}

function SlotGrid({
  slots,
  selected,
  onSelect,
}: {
  slots: Map<string, string[]>;
  selected: string | null;
  onSelect: (slotStart: string, doctorId: string | null) => void;
}) {
  const entries = [...slots.entries()];

  return (
    <fieldset>
      <legend className="mb-2.5 text-sm font-medium text-neutral-800">
        Horarios disponibles
      </legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {entries.map(([start, doctorIds]) => {
          const time = new Intl.DateTimeFormat("es-CL", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "America/Santiago",
          }).format(new Date(start));

          const isSelected = selected === start;
          const single = doctorIds.length === 1;

          return (
            <button
              key={start}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(start, single ? doctorIds[0] : null)}
              className={`min-h-11 rounded-xl border text-sm font-semibold transition-colors ${
                isSelected
                  ? "border-brand-navy bg-brand-navy text-white"
                  : "border-neutral-300 bg-white text-brand-navy hover:border-brand-navy hover:bg-brand-navy-50"
              }`}
            >
              {time}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-neutral-600">
        Si una hora aparece en más de un profesional, al reservar te asignamos al primero disponible.
      </p>
    </fieldset>
  );
}

function isStepReachable(
  step: Step,
  state: { serviceId: string | null; doctorId: string | null; day: string | null; slotStart: string | null },
): boolean {
  switch (step) {
    case 1:
    case 2:
      return Boolean(state.serviceId);
    case 3:
      return Boolean(state.serviceId);
    case 4:
      return Boolean(state.slotStart);
    default:
      return false;
  }
}

function groupSlotsByStart(slots: SlotWithDoctor[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const slot of slots) {
    const list = map.get(slot.slot_start) ?? [];
    list.push(slot.doctor_id);
    map.set(slot.slot_start, list);
  }
  return map;
}

function slotSummary(
  slotStart: string | null,
  day: string | null,
  timezone: string,
): string {
  if (!slotStart) return "—";
  const date = new Date(slotStart);
  const label = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: timezone,
  }).format(date);
  const time = new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(date);
  return `${label}, ${time} hrs${day ? "" : ""}`;
}

export type { Slot };