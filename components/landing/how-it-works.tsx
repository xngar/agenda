export default function HowItWorks() {
  return (
    <section id="como-funciona" className="bg-gradient-to-b from-[var(--lp-sky-100)] to-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--lp-navy)] sm:text-4xl">
            Empezar es simple
          </h2>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              n: 1,
              title: "Solicitas una demo.",
              text: "Te mostramos la plataforma y resolvemos tus dudas.",
            },
            {
              n: 2,
              title: "Configuramos tu consulta.",
              text: "Elegimos el tipo de ficha, tus horarios y tu equipo.",
            },
            {
              n: 3,
              title: "Empiezas a agendar.",
              text: "Tus pacientes reservan online y tú gestionas todo desde un solo lugar.",
            },
          ].map((step) => (
            <article
              key={step.n}
              className="relative rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[var(--lp-sky-200)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--lp-navy)] text-sm font-bold text-white">
                {step.n}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--lp-navy)]">{step.title}</h3>
              <p className="mt-2 text-sm text-[var(--lp-navy)]/80">{step.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
