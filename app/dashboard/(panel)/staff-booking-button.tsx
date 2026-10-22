"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, ErrorNotice, buttonClasses, inputClasses } from "@/components/ui";
import { AsyncButton } from "@/components/motion/async-button";
import { formatTime, todayKey } from "@/lib/dates";
import { formatRutPartial, isValidRut } from "@/lib/rut";
import { formatPhonePartial } from "@/lib/phone";
import { AnimatePresence } from "motion/react";
import { Modal } from "@/components/motion/modal";

export interface StaffService {
  id: string;
  name: string;
  duration_min: number;
}

export interface StaffDoctor {
  id: string;
  full_name: string;
}

interface PatientHit {
  id: string;
  full_name: string;
  rut: string | null;
  phone: string | null;
  email: string | null;
}

const label = "mb-1 block text-xs font-medium text-neutral-600";

export function StaffBookingButton({
  services,
  doctors,
  defaultDoctorId,
  defaultDate,
}: {
  services: StaffService[];
  doctors: StaffDoctor[];
  defaultDoctorId: string | null;
  defaultDate: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button variant="flat" size="md" shape="pill" onClick={() => setOpen(true)}>
        + Nueva reserva
      </Button>
      <AnimatePresence>
        {open ? (
          <StaffBookingModal
            services={services}
            doctors={doctors}
            defaultDoctorId={defaultDoctorId}
            defaultDate={defaultDate}
            onClose={() => setOpen(false)}
            onCreated={() => {
              setOpen(false);
              router.refresh();
            }}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}

function StaffBookingModal({
  services,
  doctors,
  defaultDoctorId,
  defaultDate,
  onClose,
  onCreated,
}: {
  services: StaffService[];
  doctors: StaffDoctor[];
  defaultDoctorId: string | null;
  defaultDate: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [hits, setHits] = useState<PatientHit[]>([]);
  const [hitsQuery, setHitsQuery] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [elegido, setElegido] = useState<PatientHit | null>(null);

  const [fullName, setFullName] = useState("");
  const [rut, setRut] = useState("");
  const [phone, setPhone] = useState(formatPhonePartial(""));
  const [email, setEmail] = useState("");

  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [doctorId, setDoctorId] = useState(defaultDoctorId ?? doctors[0]?.id ?? "");
  const [date, setDate] = useState(defaultDate);
  const [slots, setSlots] = useState<{ slot_start: string; slot_end: string }[]>([]);
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [slotStart, setSlotStart] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  useEffect(() => {
    if (elegido || busqueda.trim().length < 2) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setBuscando(true);
      const q = busqueda.trim();
      try {
        const res = await fetch(`/api/dashboard/patients/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { patients?: PatientHit[] };
        setHits(data.patients ?? []);
        setHitsQuery(q);
      } catch {
        setHits([]);
        setHitsQuery(q);
      } finally {
        setBuscando(false);
      }
    }, 300);
  }, [busqueda, elegido]);

  const cargarSlots = useCallback(async () => {
    if (!serviceId || !doctorId || !date) return;
    setCargandoSlots(true);
    try {
      const res = await fetch(
        `/api/dashboard/slots?date=${date}&serviceId=${serviceId}&doctorId=${doctorId}`,
      );
      const data = (await res.json()) as { slots?: { slot_start: string; slot_end: string }[] };
      setSlots(data.slots ?? []);
      setSlotStart("");
    } catch {
      setSlots([]);
    } finally {
      setCargandoSlots(false);
    }
  }, [serviceId, doctorId, date]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch de slots al cambiar servicio/profesional/día, setState tras await
    cargarSlots();
  }, [cargarSlots]);

  function elegir(p: PatientHit) {
    setElegido(p);
    setFullName(p.full_name);
    setRut(formatRutPartial(p.rut ?? ""));
    setPhone(formatPhonePartial(p.phone ?? ""));
    setEmail(p.email ?? "");
    setHits([]);
  }

  function soltar() {
    setElegido(null);
    setFullName("");
    setRut("");
    setPhone(formatPhonePartial(""));
    setEmail("");
    setBusqueda("");
  }

  const servicio = services.find((s) => s.id === serviceId);
  const doctor = doctors.find((d) => d.id === doctorId);
  const puedeBuscarPaciente =
    !elegido &&
    busqueda.trim().length >= 2 &&
    (buscando || (hitsQuery === busqueda.trim() && hits.length > 0));
  const puedeElegirHora = Boolean(serviceId && doctorId && date);
  const puedeGuardar =
    fullName.trim().length >= 2 &&
    isValidRut(rut) &&
    email.trim().length > 0 &&
    slotStart !== "" &&
    !guardando;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!puedeGuardar) return;
    setError(null);
    setGuardando(true);
    try {
      const res = await fetch("/api/dashboard/appointments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          doctorId,
          slotStart,
          fullName: fullName.trim(),
          rut,
          phone,
          email: email.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear la reserva");
        return;
      }
      toast.success(
        `Reserva creada para ${fullName.trim()} · ${doctor?.full_name ?? "profesional"}`,
      );
      onCreated();
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      onClose={onClose}
      title="Nueva reserva"
      description="La cita queda confirmada de inmediato y se avisa por correo al paciente."
      size="2xl"
    >
      <form onSubmit={guardar} className="mt-4 space-y-5">
        {error ? <ErrorNotice message={error} /> : null}

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-brand-navy">Paciente</legend>
          {elegido ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-sky-50 px-3 py-2">
              <p className="text-sm font-medium text-brand-navy-900">
                {elegido.full_name}
                {elegido.rut ? ` · ${formatRutPartial(elegido.rut)}` : ""}
              </p>
              <button
                type="button"
                onClick={soltar}
                className="text-sm font-medium text-brand-navy-700 underline-offset-2 hover:underline"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <div className="relative">
              <label className="block">
                <span className={label}>Buscar paciente registrado</span>
                <input
                  className={inputClasses}
                  value={busqueda}
                  placeholder="Nombre, RUT o correo… (o completa los datos abajo)"
                  autoComplete="off"
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </label>
              {puedeBuscarPaciente ? (
                <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-card">
                  {buscando ? (
                    <li className="px-3 py-2 text-sm text-neutral-500">Buscando…</li>
                  ) : (
                    hits.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => elegir(p)}
                          className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-action-primary/5"
                        >
                          <span className="font-medium text-neutral-900">{p.full_name}</span>
                          <span className="block text-xs text-neutral-500">
                            {[p.rut ? formatRutPartial(p.rut) : null, p.email].filter(Boolean).join(" · ")}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <label className="block">
              <span className={label}>RUT</span>
              <input
                className={inputClasses}
                value={rut}
                placeholder="12.345.678-9"
                maxLength={16}
                onChange={(e) => setRut(formatRutPartial(e.target.value))}
                onBlur={() => setRut((v) => formatRutPartial(v))}
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
            </label>
            <label className="block">
              <span className={label}>Correo</span>
              <input
                className={inputClasses}
                type="email"
                required
                value={email}
                placeholder="paciente@correo.cl"
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-brand-navy">Hora</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block">
              <span className={label}>Servicio</span>
              <select
                className={inputClasses}
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>Profesional</span>
              <select
                className={inputClasses}
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>Día</span>
              <input
                type="date"
                className={inputClasses}
                value={date}
                min={todayKey()}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>

          <div className="mt-3">
            <span className={label}>Horas disponibles{servicio ? ` · ${servicio.name}` : ""}</span>
            {!puedeElegirHora ? (
              <p className="text-sm text-neutral-500">Elige servicio, profesional y día.</p>
            ) : cargandoSlots ? (
              <p className="text-sm text-neutral-500">Cargando horas…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Sin horas libres ese día. Prueba con otro día o profesional.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Horas disponibles">
                {slots.map((s) => (
                  <button
                    key={s.slot_start}
                    type="button"
                    aria-pressed={slotStart === s.slot_start}
                    onClick={() => setSlotStart(s.slot_start)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-semibold tabular-nums transition-[color,background-color,border-color,box-shadow,transform] duration-micro ease-out-soft active:scale-95 cursor-pointer ${
                      slotStart === s.slot_start
                        ? "border-action-primary bg-action-primary text-action-primary-foreground shadow-xs scale-[1.03]"
                        : "border-neutral-300 bg-white text-neutral-700 hover:border-action-primary/40 hover:bg-action-primary/5 hover:text-action-primary hover:shadow-2xs"
                    }`}
                  >
                    {formatTime(s.slot_start)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </fieldset>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <AsyncButton
            type="submit"
            loading={guardando}
            disabled={!puedeGuardar}
            pendingLabel="Creando la reserva"
            className={buttonClasses("primary", "md")}
          >
            Crear reserva
          </AsyncButton>
        </div>
      </form>
    </Modal>
  );
}
