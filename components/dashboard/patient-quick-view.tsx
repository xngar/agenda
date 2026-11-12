"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  FileText,
  HeartPulse,
  MapPin,
  Phone,
  Stethoscope,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetMain,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Button,
  ErrorNotice,
  SkeletonBlock,
  StatusBadge,
  buttonClasses,
} from "@/components/ui";
import { WhatsappButton } from "@/components/dashboard/whatsapp-button";
import {
  formatDateMedium,
  formatDayKey,
  formatTime,
} from "@/lib/dates";
import { formatPhonePartial } from "@/lib/phone";
import { formatRut } from "@/lib/rut";
import type { PatientSummary } from "@/lib/ficha/summary-types";
import type { AppointmentStatus } from "@/lib/types";

export interface QuickViewAppointment {
  start: string | null;
  end: string | null;
  serviceName: string | null;
  status: AppointmentStatus;
}

interface PatientQuickViewContextValue {
  open: (patientId: string, appointment?: QuickViewAppointment) => void;
}

const PatientQuickViewContext = createContext<PatientQuickViewContextValue>({
  open: () => {},
});

export function usePatientQuickView(): PatientQuickViewContextValue {
  return useContext(PatientQuickViewContext);
}

export function PatientQuickViewProvider({
  orgName,
  timezone,
  children,
}: {
  orgName: string;
  timezone?: string;
  children: ReactNode;
}) {
  const [target, setTarget] = useState<{
    patientId: string;
    appointment: QuickViewAppointment | null;
  } | null>(null);

  const open = useCallback((patientId: string, appointment?: QuickViewAppointment) => {
    setTarget({ patientId, appointment: appointment ?? null });
  }, []);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <PatientQuickViewContext.Provider value={value}>
      {children}
      <PatientQuickViewSheet
        target={target}
        orgName={orgName}
        timezone={timezone}
        onClose={() => setTarget(null)}
      />
    </PatientQuickViewContext.Provider>
  );
}

type LoadState =
  | { status: "loading" }
  | { status: "ready"; summary: PatientSummary }
  | { status: "error"; message: string };

type QuickViewTarget = {
  patientId: string;
  appointment: QuickViewAppointment | null;
};

function PatientQuickViewSheet({
  target,
  orgName,
  timezone,
  onClose,
}: {
  target: QuickViewTarget | null;
  orgName: string;
  timezone?: string;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={Boolean(target)}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        {target ? (
          <PatientQuickViewBody
            key={target.patientId}
            target={target}
            orgName={orgName}
            timezone={timezone}
            onClose={onClose}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function PatientQuickViewBody({
  target,
  orgName,
  timezone,
  onClose,
}: {
  target: QuickViewTarget;
  orgName: string;
  timezone?: string;
  onClose: () => void;
}) {
  const { patientId, appointment } = target;
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/dashboard/patients/${patientId}/summary`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          summary?: PatientSummary;
          error?: string;
        };
        if (!response.ok || !data.summary) {
          setState({
            status: "error",
            message: data.error ?? "No se pudo cargar el perfil del paciente",
          });
          return;
        }
        setState({ status: "ready", summary: data.summary });
      })
      .catch((error: unknown) => {
        if ((error as Error).name === "AbortError") return;
        setState({
          status: "error",
          message: "No pudimos conectarnos. Intenta de nuevo.",
        });
      });

    return () => controller.abort();
  }, [patientId, attempt]);

  const paciente = state.status === "ready" ? state.summary.patient : null;

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4">
        <SheetTitle className="flex flex-wrap items-center gap-2 pr-12 text-lg text-action-primary">
          <span>{paciente?.full_name ?? "Perfil del paciente"}</span>
          {paciente ? (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                ESTADO_PACIENTE[paciente.patient_status]?.className ??
                ESTADO_PACIENTE.inactive.className
              }`}
            >
              {ESTADO_PACIENTE[paciente.patient_status]?.label ?? paciente.patient_status}
            </span>
          ) : null}
        </SheetTitle>
        <SheetDescription>
          {paciente
            ? descripcionPaciente(paciente)
            : "Información rápida para poner en contexto la atención."}
        </SheetDescription>
      </SheetHeader>

      <SheetMain className="px-6 pb-4">
        {state.status === "loading" ? (
          <div className="space-y-3" aria-label="Cargando perfil del paciente">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-32" />
            <SkeletonBlock className="h-24" />
          </div>
        ) : state.status === "error" ? (
          <ErrorNotice
            title="No se pudo abrir el perfil"
            message={state.message}
            action={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setState({ status: "loading" });
                  setAttempt((value) => value + 1);
                }}
              >
                Reintentar
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {appointment ? (
              <CitaActual appointment={appointment} timezone={timezone} />
            ) : null}
            <PatientQuickViewDetails
              summary={state.summary}
              orgName={orgName}
              timezone={timezone}
            />
          </div>
        )}
      </SheetMain>

      <SheetFooter className="px-6 pb-6">
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}

function CitaActual({
  appointment,
  timezone,
}: {
  appointment: QuickViewAppointment;
  timezone?: string;
}) {
  const { start, end } = appointment;

  return (
    <div className="flex items-start gap-3 rounded-card border border-action-primary/15 bg-action-primary/5 px-4 py-3">
      <CalendarClock className="mt-0.5 size-4 shrink-0 text-action-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-action-primary">
          {start ? formatDateMedium(start, timezone) : "Cita"}
          {start && end
            ? ` · ${formatTime(start, timezone)}–${formatTime(end, timezone)}`
            : start
              ? ` · ${formatTime(start, timezone)}`
              : ""}
        </p>
        <p className="mt-0.5 truncate text-xs text-neutral-600">
          {appointment.serviceName ?? "Sin servicio registrado"}
        </p>
      </div>
      <StatusBadge status={appointment.status} />
    </div>
  );
}

export function PatientQuickViewDetails({
  summary,
  orgName,
  timezone,
}: {
  summary: PatientSummary;
  orgName: string;
  timezone?: string;
}) {
  const { patient, background, last_encounter: ultima, scope } = summary;
  const clinical = scope === "clinical";
  const alergias = background?.alergias ?? [];
  const alertas = patient.treatment_alerts;
  const telefono = patient.phone ? formatPhonePartial(patient.phone) : null;
  const previsor = previsorTexto(patient);
  const domicilio = [patient.address, patient.comuna].filter(Boolean).join(", ");

  return (
    <div className="space-y-4">
      {clinical && (alertas || alergias.length > 0) ? (
        <div role="alert" className="rounded-card border border-warning-200 bg-warning-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-warning-700">
            <AlertTriangle className="size-4" aria-hidden />
            Alertas clínicas
          </p>
          {alertas ? <p className="mt-1 text-sm text-warning-700">{alertas}</p> : null}
          {alergias.length > 0 ? (
            <p className="mt-1 text-sm text-warning-700">
              <span className="font-semibold">Alergias:</span> {alergias.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}

      <Seccion title="Contacto" icon={<Phone className="size-4" />}>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Dato label="Teléfono">
            {telefono ? (
              <span className="inline-flex items-center gap-2">
                <a className="hover:text-action-primary hover:underline" href={`tel:${patient.phone}`}>
                  {telefono}
                </a>
                <WhatsappButton
                  patientId={patient.id}
                  fullName={patient.full_name}
                  phone={patient.phone}
                  orgName={orgName}
                  compacto
                />
              </span>
            ) : null}
          </Dato>
          <Dato label="Correo">
            {patient.email ? (
              <a
                className="break-all hover:text-action-primary hover:underline"
                href={`mailto:${patient.email}`}
              >
                {patient.email}
              </a>
            ) : null}
          </Dato>
          <Dato label="Dirección">
            {domicilio ? (
              <span className="inline-flex items-start gap-1">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-neutral-400" aria-hidden />
                {domicilio}
              </span>
            ) : null}
          </Dato>
          <Dato label="RUT">
            {patient.rut ? (formatRut(patient.rut) ?? patient.rut) : null}
          </Dato>
        </dl>
      </Seccion>

      <Seccion title="Previsión y emergencia" icon={<HeartPulse className="size-4" />}>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Dato label="Previsión">{previsor}</Dato>
          <Dato label="Paciente desde">
            {patient.admitted_at ? formatDayKey(patient.admitted_at) : null}
          </Dato>
          <Dato label="Contacto de emergencia">
            {patient.emergency_name
              ? `${patient.emergency_name}${patient.emergency_relation ? ` (${patient.emergency_relation})` : ""}`
              : null}
          </Dato>
          <Dato label="Teléfono de emergencia">
            {patient.emergency_phone ? formatPhonePartial(patient.emergency_phone) : null}
          </Dato>
          <Dato label="Apoderado/a">
            {patient.tutor_name
              ? `${patient.tutor_name}${patient.tutor_relation ? ` (${patient.tutor_relation})` : ""}`
              : null}
          </Dato>
          <Dato label="Teléfono apoderado">
            {patient.tutor_phone ? formatPhonePartial(patient.tutor_phone) : null}
          </Dato>
          {patient.doctor_name ? (
            <Dato label="Profesional tratante">{patient.doctor_name}</Dato>
          ) : null}
        </dl>
      </Seccion>

      {clinical ? (
        <>
          <Seccion title="Antecedentes" icon={<ClipboardList className="size-4" />}>
            {background ? (
              <dl className="grid gap-3 sm:grid-cols-2">
                <Dato label="Motivo de consulta">
                  {background.motivo_consulta ? (
                    <span className="whitespace-pre-wrap">{background.motivo_consulta}</span>
                  ) : null}
                </Dato>
                <Dato label="Embarazo o lactancia">
                  {background.embarazo_lactancia === null
                    ? null
                    : background.embarazo_lactancia
                      ? "Sí"
                      : "No"}
                </Dato>
                <Dato label="Antecedentes médicos">
                  {background.antecedentes_medicos ? (
                    <span className="whitespace-pre-wrap">{background.antecedentes_medicos}</span>
                  ) : null}
                </Dato>
                <Dato label="Antecedentes familiares">
                  {background.antecedentes_familiares ? (
                    <span className="whitespace-pre-wrap">{background.antecedentes_familiares}</span>
                  ) : null}
                </Dato>
                <Dato label="Alergias">
                  {alergias.length > 0 ? (
                    <span className="flex flex-wrap gap-1.5">
                      {alergias.map((alergia) => (
                        <span
                          key={alergia}
                          className="rounded-full border border-warning-200 bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning-700"
                        >
                          {alergia}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </Dato>
                <Dato label="Hábitos">{habitosTexto(background)}</Dato>
                <Dato label="Medicamentos">
                  {background.medicamentos.length > 0 ? (
                    <ul className="list-disc space-y-0.5 pl-4">
                      {background.medicamentos.map((medicamento, indice) => (
                        <li key={`${medicamento.nombre}-${indice}`}>
                          <span className="font-medium">{medicamento.nombre}</span>
                          {medicamento.detalle ? `: ${medicamento.detalle}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Dato>
                {background.updated_at ? (
                  <Dato label="Antecedentes actualizados">
                    {formatDateMedium(background.updated_at, timezone)}
                  </Dato>
                ) : null}
              </dl>
            ) : (
              <p className="text-sm text-neutral-600">Sin antecedentes registrados.</p>
            )}
          </Seccion>

          <Seccion title="Última atención" icon={<Stethoscope className="size-4" />}>
            {ultima ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600">
                  <span className="font-semibold text-neutral-800">
                    {formatDayKey(ultima.started_at)}
                  </span>
                  {ultima.care_type ? (
                    <span>· {CARE_TYPE[ultima.care_type] ?? ultima.care_type}</span>
                  ) : null}
                  {ultima.doctor_name ? <span>· {ultima.doctor_name}</span> : null}
                  <span
                    className={`ml-auto rounded-full border px-2 py-0.5 font-semibold ${
                      ultima.status === "signed"
                        ? "border-success-200 bg-success-50 text-success-700"
                        : "border-warning-200 bg-warning-50 text-warning-700"
                    }`}
                  >
                    {ultima.status === "signed" ? "Firmada" : "Borrador"}
                  </span>
                </div>
                <dl className="grid gap-3">
                  <Dato label="Motivo">
                    {ultima.motivo ? (
                      <span className="whitespace-pre-wrap">{ultima.motivo}</span>
                    ) : null}
                  </Dato>
                  <Dato label="Diagnóstico">
                    {ultima.diagnostico ? (
                      <span className="whitespace-pre-wrap">{ultima.diagnostico}</span>
                    ) : null}
                  </Dato>
                  <Dato label="Indicaciones">
                    {ultima.indicaciones ? (
                      <span className="whitespace-pre-wrap">{ultima.indicaciones}</span>
                    ) : null}
                  </Dato>
                  <Dato label="Próxima cita">
                    {ultima.proxima_cita_at ? formatDayKey(ultima.proxima_cita_at) : null}
                  </Dato>
                </dl>
              </div>
            ) : (
              <p className="text-sm text-neutral-600">Sin atenciones registradas.</p>
            )}
          </Seccion>
        </>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Link
          href={`/dashboard/pacientes/${patient.id}`}
          className={buttonClasses("primary", "sm")}
        >
          <FileText className="size-4" aria-hidden />
          {clinical ? "Ver ficha completa" : "Ver datos del paciente"}
        </Link>
      </div>

      {!clinical ? (
        <p className="text-xs text-neutral-500">
          La ficha clínica completa es visible sólo para el equipo clínico.
        </p>
      ) : null}
    </div>
  );
}

function Seccion({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-card border border-neutral-200 bg-white px-4 py-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-action-primary">
        <span aria-hidden className="text-action-primary/80">
          {icon}
        </span>
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Dato({ label, children }: { label: string; children: ReactNode }) {
  const vacio =
    children === null || children === undefined || children === "" || children === false;
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-sm text-neutral-900">{vacio ? "—" : children}</dd>
    </div>
  );
}

const ESTADO_PACIENTE: Record<string, { label: string; className: string }> = {
  active: { label: "Activo", className: "border-success-200 bg-success-50 text-success-700" },
  inactive: { label: "Inactivo", className: "border-neutral-200 bg-neutral-100 text-neutral-600" },
  abandoned: { label: "Abandonado", className: "border-warning-200 bg-warning-50 text-warning-700" },
};

const CARE_TYPE: Record<string, string> = {
  primera_consulta: "Primera consulta",
  control: "Control",
  urgencia: "Urgencia",
  procedimiento: "Procedimiento",
  seguimiento: "Seguimiento",
  otro: "Otro",
};

const PREVISION: Record<string, string> = {
  fonasa: "Fonasa",
  isapre: "Isapre",
  particular: "Particular",
  other: "Otro",
};

function previsorTexto(patient: PatientSummary["patient"]): string | null {
  const base = patient.prevision_type ? (PREVISION[patient.prevision_type] ?? patient.prevision_type) : null;
  if (!base) return null;
  if (patient.prevision_type === "fonasa" && patient.fonasa_tramo) {
    return `${base} · Tramo ${patient.fonasa_tramo}`;
  }
  if (patient.prevision_type === "isapre" && patient.isapre_name) {
    return `${base} · ${patient.isapre_name}${patient.isapre_plan ? ` · ${patient.isapre_plan}` : ""}`;
  }
  return base;
}

function habitosTexto(background: NonNullable<PatientSummary["background"]>): string | null {
  const partes: string[] = [];
  if (background.habitos.fuma === true || background.habitos.fuma === "true") partes.push("Fuma");
  if (background.habitos.alcohol === true || background.habitos.alcohol === "true") {
    partes.push("Consume alcohol");
  }
  if (background.habitos.ejercicio === true || background.habitos.ejercicio === "true") {
    partes.push("Realiza ejercicio");
  }
  if (typeof background.habitos.otro === "string" && background.habitos.otro.trim() !== "") {
    partes.push(background.habitos.otro.trim());
  }
  return partes.length > 0 ? partes.join(" · ") : null;
}

function edadDe(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const nacimiento = new Date(`${birthDate.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(nacimiento.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getUTCFullYear() - nacimiento.getUTCFullYear();
  const mes = hoy.getUTCMonth() - nacimiento.getUTCMonth();
  if (mes < 0 || (mes === 0 && hoy.getUTCDate() < nacimiento.getUTCDate())) edad -= 1;
  return edad >= 0 ? edad : null;
}

function descripcionPaciente(patient: PatientSummary["patient"]): string {
  const partes: string[] = [];
  if (patient.rut) partes.push(formatRut(patient.rut) ?? patient.rut);
  const edad = edadDe(patient.birth_date);
  if (edad !== null) partes.push(`${edad} años`);
  if (patient.doctor_name) partes.push(`Paciente de ${patient.doctor_name}`);
  if (partes.length === 0) partes.push("Sin datos de identificación");
  return partes.join(" · ");
}
