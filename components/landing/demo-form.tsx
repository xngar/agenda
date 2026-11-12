"use client";

import { useState } from "react";
import { siteConfig } from "@/lib/site-config";
import {
  ArrowRight,
  Clock,
  CheckCircle2,
  ShieldCheck,
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
          profesionales: formData.get("profesionales"),
          mensaje: formData.get("mensaje"),
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
    <section id="demo" className="relative overflow-hidden bg-gradient-to-b from-white via-sky-50/40 to-white py-16 sm:py-24 border-t border-slate-200/60">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Columna Izquierda: Propuesta de Valor y Garantías */}
          <div className="space-y-6 lg:col-span-5">
            <ScrollReveal yOffset={16}>
              <h2 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl [text-wrap:balance]">
                Lleva tu consulta al siguiente nivel
              </h2>

              <p className="mt-5 text-base sm:text-lg text-neutral-600 [text-wrap:balance]">
                Agenda una demo personalizada y descubre cómo {siteConfig.name} elimina el desorden en tu día a día, reduce las inasistencias y protege los datos de tus pacientes.
              </p>
            </ScrollReveal>

            {/* Tarjetas de Beneficios */}
            <div className="space-y-3.5 pt-2">
              {[
                {
                  icon: Clock,
                  title: "Respuesta en menos de 2 horas",
                  desc: "Te contactamos de inmediato en horario hábil para coordinar tu demostración.",
                },
                {
                  icon: ShieldCheck,
                  title: "Sin compromiso ni costo inicial",
                  desc: "Revisas la plataforma en vivo antes de tomar cualquier decisión para tu consulta.",
                },
                {
                  icon: CheckCircle2,
                  title: "Puesta en marcha guiada en 24h",
                  desc: "Te entregamos la clínica configurada con tus profesionales y fichas listas.",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3.5 rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-2xs">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-[var(--lp-navy)]">
                    <Icon className="h-4.5 w-4.5 text-action-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">{title}</h3>
                    <p className="mt-0.5 text-xs text-neutral-600 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Canales de Contacto Directo */}
            <div className="flex flex-wrap items-center gap-4 pt-3 text-xs text-neutral-600">
              <a
                href={`https://wa.me/${siteConfig.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Escríbenos a WhatsApp</span>
              </a>
              <span>·</span>
              <a
                href={`mailto:${siteConfig.email}`}
                className="inline-flex items-center gap-1.5 font-bold text-[var(--lp-blue)] hover:text-[var(--lp-navy)] transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span>{siteConfig.email}</span>
              </a>
            </div>
          </div>

          {/* Columna Derecha: Formulario Pulido */}
          <div className="lg:col-span-7">
            <ScrollReveal yOffset={20}>
              <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl sm:p-8">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h3 className="text-lg font-bold text-neutral-900">Solicitar demostración sin compromiso</h3>
                  <p className="text-xs text-neutral-500 mt-1">Completa estos datos y te responderemos a la brevedad</p>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-neutral-800" htmlFor="nombre">
                        Nombre completo *
                      </label>
                      <input
                        id="nombre"
                        name="nombre"
                        required
                        placeholder="Dr. Juan Pérez"
                        className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[var(--lp-blue)] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[var(--lp-blue)]/15 transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-neutral-800" htmlFor="correo">
                        Correo electrónico *
                      </label>
                      <input
                        id="correo"
                        name="correo"
                        type="email"
                        required
                        placeholder="contacto@tumedico.cl"
                        className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[var(--lp-blue)] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[var(--lp-blue)]/15 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-neutral-800" htmlFor="telefono">
                        Teléfono o WhatsApp *
                      </label>
                      <input
                        id="telefono"
                        name="telefono"
                        required
                        placeholder="+56 9 1234 5678"
                        className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[var(--lp-blue)] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[var(--lp-blue)]/15 transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-neutral-800" htmlFor="tipo">
                        Tipo de consulta o clínica *
                      </label>
                      <select
                        id="tipo"
                        name="tipo"
                        required
                        defaultValue=""
                        className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-[var(--lp-blue)] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[var(--lp-blue)]/15 transition-all"
                      >
                        <option value="" disabled>Selecciona especialidad</option>
                        <option value="odontologia">Odontología / Dental</option>
                        <option value="medicina">Medicina General / Especialidad</option>
                        <option value="psicologia">Psicología / Salud Mental</option>
                        <option value="otra">Centro Multidisciplinario / Otra</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-neutral-800" htmlFor="profesionales">
                      Cantidad estimada de profesionales *
                    </label>
                    <input
                      id="profesionales"
                      name="profesionales"
                      required
                      placeholder="Ej: 1 profesional, o 4 especialistas"
                      className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[var(--lp-blue)] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[var(--lp-blue)]/15 transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-neutral-800" htmlFor="mensaje">
                      ¿Qué te gustaría resolver principalmente? (Opcional)
                    </label>
                    <textarea
                      id="mensaje"
                      name="mensaje"
                      rows={3}
                      placeholder="Ej: Reducir las ausencias por WhatsApp, digitalizar odontogramas..."
                      className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[var(--lp-blue)] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[var(--lp-blue)]/15 transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--lp-navy)] py-3.5 px-6 text-sm font-bold text-white shadow-md transition-all duration-micro hover:scale-[1.01] hover:bg-[var(--lp-blue)] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Enviando solicitud...</span>
                      </>
                    ) : (
                      <>
                        <span>Solicitar demo guiada gratuita</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  {status === "success" && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-medium text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>¡Solicitud recibida con éxito! Te contactaremos a la brevedad para coordinar la demo.</span>
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
