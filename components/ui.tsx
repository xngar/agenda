import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Botones                                                              */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-navy text-white hover:bg-brand-navy-700 active:bg-brand-navy-800 shadow-card disabled:bg-neutral-300",
  secondary:
    "bg-brand-sky text-brand-navy-900 hover:bg-brand-sky-400 active:bg-brand-sky-600 border border-brand-navy-700/20",
  ghost:
    "bg-transparent text-brand-navy hover:bg-brand-navy-50 border border-brand-navy-200",
  danger:
    "bg-brand-navy-900 text-white hover:bg-brand-navy-800 border border-brand-navy-800",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm gap-1.5",
  md: "min-h-11 px-4 text-sm gap-2",
  lg: "min-h-12 px-6 text-base gap-2",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = "",
): string {
  return [
    "inline-flex items-center justify-center rounded-xl font-semibold transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy",
    "disabled:opacity-55 disabled:cursor-not-allowed",
    VARIANTS[variant],
    SIZES[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} {...props} />
  );
}

/* ------------------------------------------------------------------ */
/* Superficies                                                          */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <Tag
      className={`rounded-card border border-neutral-200 bg-white shadow-card ${className}`}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-brand-navy">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-neutral-600">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Formularios                                                          */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required = true,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-neutral-800">
        {label}
        {required ? (
          <span className="ml-1 text-brand-navy" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-1 text-xs font-normal text-neutral-500">(opcional)</span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm font-medium text-brand-navy-900">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-neutral-600">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const inputClasses =
  "w-full min-h-11 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-800 " +
  "placeholder:text-neutral-500 focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-sky " +
  "disabled:bg-neutral-100 disabled:text-neutral-500 aria-[invalid=true]:border-brand-navy-900";

export const inputErrorClasses = inputClasses;

/* ------------------------------------------------------------------ */
/* Estados                                                              */
/* ------------------------------------------------------------------ */

export function Spinner({ label = "Cargando" }: { label?: string }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-brand-navy-200 border-t-brand-navy"
      />
      <span className="text-sm text-neutral-600">{label}</span>
    </span>
  );
}

export function SkeletonBlock({ className = "h-20" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-card bg-neutral-200/70 ${className}`}
    />
  );
}

export function LoadingPanel({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16" role="status">
      <span
        aria-hidden="true"
        className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand-navy-100 border-t-brand-navy"
      />
      <p className="text-sm text-neutral-600">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon = "calendario",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: "calendario" | "diente" | "correo";
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-sky-50 text-brand-navy"
      >
        {icon === "correo" ? <CorreoIcon /> : icon === "diente" ? <DienteIcon /> : <CalendarioIcon />}
      </span>
      <p className="text-base font-semibold text-brand-navy">{title}</p>
      {description ? <p className="max-w-sm text-sm text-neutral-600">{description}</p> : null}
      {action}
    </div>
  );
}

export function ErrorNotice({
  title = "Algo salió mal",
  message,
  action,
}: {
  title?: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-card border border-brand-navy-700/25 bg-brand-navy-50 px-4 py-3"
    >
      <p className="text-sm font-semibold text-brand-navy">{title}</p>
      <p className="text-sm text-neutral-800">{message}</p>
      {action}
    </div>
  );
}

export function InfoNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-card border border-brand-sky-400/40 bg-brand-sky-50 px-4 py-3 text-sm text-brand-navy-900">
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Insignias de estado                                                  */
/* ------------------------------------------------------------------ */

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    confirmed: { label: "Confirmada", className: "bg-brand-navy text-white" },
    pending: {
      label: "Por confirmar",
      className: "bg-brand-sky-100 text-brand-navy-900 border border-brand-sky-400/50",
    },
    cancelled: {
      label: "Cancelada",
      className: "bg-neutral-200 text-neutral-600 line-through decoration-neutral-500",
    },
    completed: { label: "Atendida", className: "bg-neutral-100 text-neutral-800" },
    no_show: { label: "No asistió", className: "bg-brand-navy-100 text-brand-navy-900" },
  };

  const entry = map[status] ?? { label: status, className: "bg-neutral-100 text-neutral-800" };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${entry.className}`}
    >
      {entry.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Iconos (inline, sin dependencias)                                    */
/* ------------------------------------------------------------------ */

function CalendarioIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

function DienteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M12 3c-2 0-3 1-5 1S4 5 4 5c-1 2-1 5 0 8s2 8 4 8 2-4 4-4 2 4 4 4 3-5 4-8 1-6 0-8c0 0-2 1-3 1s-3-1-5-1Z" />
    </svg>
  );
}

function CorreoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}