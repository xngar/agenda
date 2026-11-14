"use client";

import {
  Stethoscope,
  Brain,
  Lock,
  Smile,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { useMotionPrefs } from "@/components/motion/use-motion-prefs";

export default function Features() {
  const [tab, setTab] = useState<"odontologia" | "medicina" | "psicologia">("odontologia");
  const [selectedTooth, setSelectedTooth] = useState<number>(18);
  const { reduce } = useMotionPrefs();

  const teethData: Record<number, { name: string; treatment: string; status: string; color: string }> = {
    18: { name: "Pieza 1.8 · Tercer molar", treatment: "Obturación resina compuesta", status: "Tratada", color: "bg-emerald-500" },
    17: { name: "Pieza 1.7 · Segundo molar", treatment: "Sin hallazgos", status: "Sana", color: "bg-sky-400" },
    16: { name: "Pieza 1.6 · Primer molar", treatment: "Corona cerámica", status: "Finalizado", color: "bg-blue-600" },
    11: { name: "Pieza 1.1 · Incisivo central", treatment: "Control de blanqueamiento", status: "En seguimiento", color: "bg-emerald-500" },
    21: { name: "Pieza 2.1 · Incisivo central", treatment: "Sin hallazgos", status: "Sana", color: "bg-sky-400" },
    26: { name: "Pieza 2.6 · Primer molar", treatment: "Sellante preventivo", status: "Preventivo", color: "bg-indigo-500" },
  };

  return (
    <section id="funciones" className="relative bg-neutral-50/70 py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal yOffset={16} className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl [text-wrap:balance]">
            Hecha para tu especialidad
          </h2>

          <p className="mt-5 text-base text-neutral-500 sm:text-xl [text-wrap:balance]">
            Ficha clínica y recordatorios adaptados a cómo trabajas.
          </p>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-12">
          {/* Tarjeta 1: Ficha Clínica por Especialidad */}
          <div className="flex flex-col justify-between rounded-3xl border border-neutral-200/80 bg-white p-7 shadow-2xs lg:col-span-7 sm:p-8">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-neutral-900">Ficha clínica por especialidad</h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    Campos clínicos estructurados según tu área de atención.
                  </p>
                </div>

                <div className="flex items-center rounded-full bg-neutral-100 p-1 text-xs font-medium">
                  {(
                    [
                      { id: "odontologia", label: "Odontología", icon: Smile },
                      { id: "medicina", label: "Medicina", icon: Stethoscope },
                      { id: "psicologia", label: "Salud Mental", icon: Brain },
                    ] as const
                  ).map(({ id, label, icon: Icon }) => {
                    const isActive = tab === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTab(id)}
                        className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all duration-micro cursor-pointer ${
                          isActive
                            ? "bg-white font-semibold text-neutral-900 shadow-2xs"
                            : "text-neutral-500 hover:text-neutral-900"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-7 rounded-2xl bg-neutral-50/80 p-5">
                <AnimatePresence mode="wait">
                  {tab === "odontologia" && (
                    <motion.div
                      key="odontologia"
                      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-6 gap-2 sm:gap-3">
                        {[18, 17, 16, 11, 21, 26].map((tooth) => {
                          const isSel = selectedTooth === tooth;
                          const data = teethData[tooth];
                          return (
                            <button
                              key={tooth}
                              type="button"
                              onClick={() => setSelectedTooth(tooth)}
                              className={`flex flex-col items-center justify-center rounded-xl border p-2.5 transition-all duration-micro cursor-pointer ${
                                isSel
                                  ? "border-neutral-900 bg-white shadow-2xs"
                                  : "border-neutral-200/80 bg-white/60 hover:bg-white"
                              }`}
                            >
                              <span className="font-mono text-[11px] font-semibold text-neutral-500">
                                {tooth}
                              </span>
                              <span className={`mt-2 h-2.5 w-2.5 rounded-full ${data.color}`} />
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-xs shadow-3xs">
                        <div>
                          <div className="font-bold text-neutral-900">{teethData[selectedTooth].name}</div>
                          <div className="mt-0.5 text-neutral-500">{teethData[selectedTooth].treatment}</div>
                        </div>
                        <span className="rounded-full bg-neutral-100 px-2.5 py-1 font-medium text-neutral-700">
                          {teethData[selectedTooth].status}
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {tab === "medicina" && (
                    <motion.div
                      key="medicina"
                      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
                    >
                      {[
                        { label: "Presión arterial", value: "120/80", unit: "mmHg" },
                        { label: "Frecuencia card.", value: "72", unit: "lpm" },
                        { label: "Saturación O₂", value: "98%", unit: "SpO₂" },
                        { label: "Temperatura", value: "36.6", unit: "°C" },
                      ].map((vital) => (
                        <div key={vital.label} className="rounded-xl bg-white p-3.5 shadow-3xs">
                          <div className="text-[11px] text-neutral-500">{vital.label}</div>
                          <div className="mt-1.5 font-mono text-lg font-bold text-neutral-900">
                            {vital.value}{" "}
                            <span className="text-[11px] font-normal text-neutral-400">{vital.unit}</span>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {tab === "psicologia" && (
                    <motion.div
                      key="psicologia"
                      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-xl bg-white p-4 text-xs leading-relaxed text-neutral-600 shadow-3xs"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-bold text-neutral-900">Sesión #4 · Evolución clínica</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-700">
                          <Lock className="h-3 w-3" /> Privado del profesional
                        </span>
                      </div>
                      Adherencia positiva al plan terapéutico. Notas privadas protegidas y consentimiento informado digital resguardado en la ficha.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Recordatorios por WhatsApp */}
          <div className="flex flex-col justify-between rounded-3xl border border-neutral-200/80 bg-white p-7 shadow-2xs lg:col-span-5 sm:p-8">
            <div>
              <h3 className="text-xl font-bold text-neutral-900">Recordatorios por WhatsApp</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Envía el recordatorio de la cita en un clic y reduce inasistencias.
              </p>

              <div className="mt-7 rounded-2xl bg-neutral-50/80 p-5">
                <div className="rounded-2xl bg-white p-4 text-xs leading-relaxed text-neutral-800 shadow-3xs">
                  <p>
                    Hola <strong>Matías</strong>, te recordamos tu cita mañana a las{" "}
                    <strong>11:30 hrs</strong> con la <strong>Dra. Soto</strong>. ¿Nos confirmas tu asistencia?
                  </p>
                  <div className="mt-2 text-right text-[10px] text-neutral-400">10:00 · ✓✓</div>
                </div>

                <div className="mt-2.5 ml-auto max-w-[82%] rounded-2xl bg-emerald-50/90 px-4 py-3 text-xs text-emerald-950">
                  ¡Hola! Sí, confirmo mi asistencia. Nos vemos mañana.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
