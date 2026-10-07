"use client";

import { useState } from "react";
import { siteConfig } from "@/lib/site-config";

export default function DemoForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        body: JSON.stringify({
          nombre: formData.get("nombre"),
          correo: formData.get("correo"),
          telefono: formData.get("telefono"),
          tipo: formData.get("tipo"),
          profesionales: formData.get("profesionales"),
          mensaje: formData.get("mensaje"),
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Error al enviar");
      setStatus("success");
      form.reset();
    } catch {
      setError("No se pudo enviar el formulario. Inténtalo de nuevo.");
      setStatus("error");
    }
  }

  return (
    <section id="demo" className="bg-gradient-to-b from-[var(--lp-sky-100)] to-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--lp-navy)] sm:text-4xl">
            Lleva tu consulta al siguiente nivel
          </h2>
          <p className="mt-4 text-lg text-[var(--lp-navy)]/90">
            Agenda una demo y mira cómo {siteConfig.name} puede ordenar tu día a día.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[var(--lp-sky-200)] sm:p-8">
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[var(--lp-navy)]" htmlFor="nombre">
                  Nombre
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  required
                  className="rounded-lg border border-[var(--lp-sky-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--lp-blue)]/40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[var(--lp-navy)]" htmlFor="correo">
                  Correo
                </label>
                <input
                  id="correo"
                  name="correo"
                  type="email"
                  required
                  className="rounded-lg border border-[var(--lp-sky-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--lp-blue)]/40"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[var(--lp-navy)]" htmlFor="telefono">
                  Teléfono o WhatsApp
                </label>
                <input
                  id="telefono"
                  name="telefono"
                  required
                  className="rounded-lg border border-[var(--lp-sky-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--lp-blue)]/40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[var(--lp-navy)]" htmlFor="tipo">
                  Tipo de consulta
                </label>
                <select
                  id="tipo"
                  name="tipo"
                  required
                  className="rounded-lg border border-[var(--lp-sky-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--lp-blue)]/40"
                >
                  <option value="">Selecciona</option>
                  <option value="odontologia">Odontología</option>
                  <option value="medicina">Medicina</option>
                  <option value="psicologia">Psicología</option>
                  <option value="otra">Otra</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--lp-navy)]" htmlFor="profesionales">
                Cantidad de profesionales
              </label>
              <input
                id="profesionales"
                name="profesionales"
                required
                className="rounded-lg border border-[var(--lp-sky-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--lp-blue)]/40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--lp-navy)]" htmlFor="mensaje">
                Mensaje (opcional)
              </label>
              <textarea
                id="mensaje"
                name="mensaje"
                rows={4}
                className="rounded-lg border border-[var(--lp-sky-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--lp-blue)]/40"
              />
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="mt-2 rounded-full bg-[var(--lp-navy)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--lp-blue)] disabled:opacity-60"
            >
              {status === "loading" ? "Enviando..." : "Solicitar demo"}
            </button>
            {status === "success" ? (
              <p className="text-sm font-medium text-[var(--lp-blue)]">
                Gracias. Te contactaremos pronto.
              </p>
            ) : null}
            {status === "error" ? (
              <p className="text-sm font-medium text-red-600">{error}</p>
            ) : null}
          </form>
          <div className="mt-6 border-t border-[var(--lp-sky-200)] pt-4 text-sm text-[var(--lp-navy)]/80">
            <p>
              Contacto: <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a> ·{" "}
              <a href={`https://wa.me/${siteConfig.whatsapp.replace(/\D/g, "")}`}>WhatsApp</a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
