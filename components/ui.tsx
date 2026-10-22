import type { CSSProperties, ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Botones                                                              */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "flat";
type ButtonSize = "sm" | "md" | "lg";
type ButtonShape = "default" | "pill";

const SHAPES: Record<ButtonShape, string> = {
  default: "rounded-full",
  pill: "rounded-full",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-action-primary text-action-primary-foreground hover:bg-action-primary-hover disabled:bg-neutral-300 disabled:text-neutral-500",
  secondary:
    "border border-transparent bg-action-primary text-action-primary-foreground hover:bg-action-primary-hover disabled:bg-neutral-300 disabled:text-neutral-500",
  ghost:
    "border border-neutral-200 bg-white text-action-primary hover:bg-action-primary/5 disabled:text-neutral-500",
  danger:
    "border border-transparent bg-red-600 text-white hover:bg-red-500 disabled:bg-neutral-300 disabled:text-neutral-500",
  flat:
    "border border-transparent bg-action-primary text-action-primary-foreground hover:bg-action-primary-hover disabled:bg-neutral-300 disabled:text-neutral-500",
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
  shape: ButtonShape = "default",
): string {
  return [
    "inline-flex items-center justify-center font-semibold transition-colors duration-element ease-in-out-soft",
    "active:scale-[0.97] cursor-pointer select-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:translate-y-0",
    VARIANTS[variant],
    SIZES[size],
    SHAPES[shape],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  shape = "default",
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
}) {
  return (
    <button type={type} className={buttonClasses(variant, size, className, shape)} {...props} />
  );
}

/* ------------------------------------------------------------------ */
/* Superficies                                                          */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  className = "",
  as: Tag = "div",
  style,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
  /** Se pasa tal cual al elemento: permite escalonar entradas con CSS. */
  style?: CSSProperties;
}) {
  return (
    <Tag
      className={`rounded-card border border-neutral-200 bg-white shadow-card ${className}`}
      style={style}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
  titleClassName = "text-action-primary",
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  titleClassName?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4">
      <div className="min-w-0">
        <h2 className={`text-base font-semibold ${titleClassName}`}>{title}</h2>
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
          <span className="ml-1 text-action-primary" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-1 text-xs font-normal text-neutral-500">(opcional)</span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm font-medium text-danger-700">
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
  "w-full min-h-11 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-800 transition-[color,background-color,border-color,box-shadow] duration-micro ease-out-soft " +
  "placeholder:text-neutral-500 hover:border-neutral-400 focus:border-brand-navy focus:outline-none focus:ring-4 focus:ring-brand-sky/25 " +
  "disabled:bg-neutral-100 disabled:text-neutral-500 " +
  "aria-[invalid=true]:border-danger-600 aria-[invalid=true]:focus:border-danger-600 aria-[invalid=true]:focus:ring-danger-100";

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
      className={`skeleton-shimmer rounded-card bg-neutral-200/70 ${className}`}
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
  titleClassName = "text-action-primary",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: "calendario" | "diente" | "correo";
  titleClassName?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-sky-50 text-action-primary"
      >
        {icon === "correo" ? <CorreoIcon /> : icon === "diente" ? <DienteIcon /> : <CalendarioIcon />}
      </span>
      <p className={`text-base font-semibold ${titleClassName}`}>{title}</p>
      {description ? <p className="max-w-sm text-sm text-neutral-600">{description}</p> : null}
      {action}
    </div>
  );
}

export function ErrorNotice({
  title,
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
      className="flex items-start gap-3 rounded-card border border-danger-200 bg-danger-50 px-4 py-3"
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-danger-100 text-danger-700"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2}>
          <path d="M10.3 3.9 2.4 17.6A1.9 1.9 0 0 0 4 20.5h16a1.9 1.9 0 0 0 1.6-2.9L13.7 3.9a1.9 1.9 0 0 0-3.4 0Z" strokeLinejoin="round" />
          <path d="M12 9v4" strokeLinecap="round" />
          <circle cx="12" cy="16.6" r="0.7" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        {title ? <p className="text-sm font-semibold text-danger-700">{title}</p> : null}
        <p className={`text-sm text-neutral-800 ${title ? "mt-0.5" : ""}`}>{message}</p>
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}

export function InfoNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-card border border-brand-sky-400/40 bg-brand-sky-50 px-4 py-3 text-sm text-action-primary">
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
      className: "bg-brand-sky-100 text-action-primary border border-brand-sky-400/50",
    },
    cancelled: {
      label: "Cancelada",
      className: "bg-neutral-200 text-neutral-600 line-through decoration-neutral-500",
    },
    completed: { label: "Atendida", className: "bg-brand-sky text-action-primary border border-brand-sky-600/40" },
    no_show: {
      label: "No asistió",
      className: "bg-danger-50 text-danger-700 border border-danger-200",
    },
  };

  const entry = map[status] ?? { label: status, className: "bg-neutral-100 text-neutral-800" };

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${entry.className}`}
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
