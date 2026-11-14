"use client";

import { useState } from "react";
import { siteConfig } from "@/lib/site-config";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  MessageCircle,
  Mail,
  Loader2,
} from "lucide-react";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

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
          profesionales: formData.get("profesionales") || "Por definir",
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Error al enviar");
      setStatus("success");
      form.reset();
    } catch {
      setError("No se pudo enviar el formulario. Inténtalo de nuevo o escríbenos a WhatsApp.");
      setStatus("error");
    }
  }

  return (
    <section id="demo" className="relative bg-neutral-50/70 py-20 sm:py-28 border-t border-neutral-200/60">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="space-y-6 lg:col-span-5">
            <ScrollReveal yOffset={16}>
              <h2 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl [text-wrap:balance]">
                Agenda una demo de 15 minutos
              </h2>

              <p className="mt-4 text-base text-neutral-500 sm:text-lg [text-wrap:balance]">
                Te mostramos {siteConfig.name} adaptado al flujo de tu consulta.
              </p>
            </ScrollReveal>

            <ul className="space-y-3 pt-2 text-sm text-neutral-700">
              {[
                "Respuesta en horario hábil",
                "Sin costo ni compromiso",
                "Puesta en marcha en menos de 24 horas",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-neutral-500">
              <a
                href={`https://wa.me/${siteConfig.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-neutral-800 hover:text-emerald-700 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp</span>
              </a>
              <span>·</span>
              <a
                href={`mailto:${siteConfig.email}`}
                className="inline-flex items-center gap-1.5 font-semibold text-neutral-800 hover:text-[var(--lp-blue)] transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span>{siteConfig.email}</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-7">
            <ScrollReveal yOffset={20}>
              <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm sm:p-8">
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-neutral-700" htmlFor="nombre">
                        Nombre
                      </label>
                      <input
                        id="nombre"
                        name="nombre"
                        required
                        placeholder="Dr. Juan Pérez"
                        className="rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[var(--lp-blue)] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[var(--lp-blue)]/15 transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-neutral-700" htmlFor="correo">
                        Correo electrónico
                      </label>
                      <input
                        id="correo"
                        name="correo"
                        type="email"
                        required
                        placeholder="contacto@tuclinica.cl"
                        className="rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[var(--lp-blue)] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[var(--lp-blue)]/15 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-neutral-700" htmlFor="telefono">
                        Teléfono o WhatsApp
                      </label>
                      <input
                        id="telefono"
                        name="telefono"
                        required
                        placeholder="+56 9 1234 5678"
                        className="rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[var(--lp-blue)] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[var(--lp-blue)]/15 transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-neutral-700" htmlFor="tipo">
                        Especialidad
                      </label>
                      <select
                        id="tipo"
                        name="tipo"
                        required
                        defaultValue=""
                        className="rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-[var(--lp-blue)] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[var(--lp-blue)]/15 transition-all"
                      >
                        <option value="" disabled>Selecciona especialidad</option>
                        <option value="odontologia">Odontología</option>
                        <option value="medicina">Medicina</option>
                        <option value="psicologia">Salud Mental</option>
                        <option value="otra">Centro Multidisciplinario</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-700" htmlFor="profesionales">
                      Tamaño del equipo
                    </label>
                    <select
                      id="profesionales"
                      name="profesionales"
                      required
                      defaultValue="1"
                      className="rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-[var(--lp-blue)] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[var(--lp-blue)]/15 transition-all"
                    >
                      <option value="1">1 profesional (consulta individual)</option>
                      <option value="2-5">2 a 5 profesionales</option>
                      <option value="6-20">6 a 20 profesionales</option>
                      <option value="20+">Más de 20 profesionales</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--lp-navy)] py-3.5 px-6 text-sm font-bold text-white shadow-sm transition-all duration-micro hover:scale-[1.01] hover:bg-[var(--lp-blue)] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <span>Solicitar demo</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  {status === "success" && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-medium text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>¡Listo! Te contactaremos pronto para coordinar la demo.</span>
                    </div>
                  )}

                  {status === "error" && (
                    <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700">
                      {error}
                    </div>
                  )}
                </form>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
