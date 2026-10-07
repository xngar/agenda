import { Stethoscope, Brain, Sparkles } from "lucide-react";

export default function Specialties() {
  return (
    <section className="border-y border-[var(--lp-sky-200)] bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {[
          { label: "Odontología", Icon: Sparkles },
          { label: "Medicina", Icon: Stethoscope },
          { label: "Psicología", Icon: Brain },
        ].map(({ label, Icon }) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-full bg-[var(--lp-sky-100)] px-4 py-2 text-sm font-medium text-[var(--lp-navy)] ring-1 ring-[var(--lp-sky-200)]"
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
