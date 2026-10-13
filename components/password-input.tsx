"use client";

import { useState } from "react";
import { inputClasses } from "./ui";

function OjoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function OjoCerradoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 3.9M6.6 6.6C4 8.2 2 12 2 12s3.5 7 10 7c1.4 0 2.7-.3 3.9-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

/**
 * Input de contraseña con visor. Vive en su propio Client Component para no
 * contaminar `ui.tsx`: ese módulo lo importan Server Components que llaman
 * a `buttonClasses()` como función, y eso revienta si el módulo es cliente.
 */
export function PasswordInput({
  id,
  name,
  autoComplete,
  required,
  minLength,
  maxLength,
  value,
  placeholder,
  onChange,
  onBlur,
  className = "",
}: {
  id: string;
  name?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative block">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`${inputClasses} pr-12 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-neutral-500 transition-colors hover:text-brand-navy focus-visible:outline-2 focus-visible:outline-brand-navy"
      >
        {visible ? <OjoCerradoIcon /> : <OjoIcon />}
      </button>
    </span>
  );
}
