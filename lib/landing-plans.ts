export const landingPlans = [
  {
    name: "[Plan 1]",
    title: "Profesional independiente",
    price: "[$/mes]",
    professionals: "[ ]",
    features: {
      agendaOnline: true,
      fichaClinica: true,
      recordatorios: false,
      soporte: "[ ]",
    },
    highlighted: false,
  },
  {
    name: "[Plan 2]",
    title: "Consulta con equipo pequeño",
    price: "[$/mes]",
    professionals: "[ ]",
    features: {
      agendaOnline: true,
      fichaClinica: true,
      recordatorios: true,
      soporte: "[ ]",
    },
    highlighted: true,
  },
  {
    name: "[Plan 3]",
    title: "Clínica con varios profesionales",
    price: "[$/mes]",
    professionals: "[ ]",
    features: {
      agendaOnline: true,
      fichaClinica: true,
      recordatorios: true,
      soporte: "[ ]",
    },
    highlighted: false,
  },
] as const;
