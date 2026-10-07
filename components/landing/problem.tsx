import { MessageCircle, CalendarX2, FileText } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export default function Problem() {
  return (
    <section className="bg-gradient-to-b from-white to-[var(--lp-sky-100)]">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--lp-navy)] sm:text-4xl">
            ¿Tu consulta todavía depende de agendas, planillas y mensajes sueltos?
          </h2>
          <p className="mt-4 text-lg text-[var(--lp-navy)]/90">
            Coordinar horas por WhatsApp, perder tiempo con las ausencias, buscar datos de un paciente entre papeles y archivos... Es tiempo que podrías dedicar a atender. {siteConfig.name} reúne todo en una sola plataforma, para que tu equipo trabaje con orden y tus pacientes tengan una mejor experiencia.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            { Icon: MessageCircle, text: "Mensajes por WhatsApp sin trazabilidad" },
            { Icon: CalendarX2, text: "Ausencias y reprogramaciones de última hora" },
            { Icon: FileText, text: "Datos dispersos entre papeles y archivos" },
          ].map(({ Icon, text }) => (
            <div
              key={text}
              className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-[var(--lp-sky-200)]"
            >
              <Icon className="h-8 w-8 text-[var(--lp-blue)]" />
              <p className="mt-3 text-sm font-medium text-[var(--lp-navy)]">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
