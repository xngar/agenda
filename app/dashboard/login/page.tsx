import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Ingresar al panel",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col justify-center bg-neutral-50 px-4">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-brand-navy">Agenda · Panel</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Acceso para profesionales de la clínica.
        </p>

        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}