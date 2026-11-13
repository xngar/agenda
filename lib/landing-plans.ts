export interface LandingPlan {
  name: string;
  title: string;
  priceMonthly: string;
  priceYearly: string;
  periodMonthly: string;
  periodYearly: string;
  professionals: string;
  features: {
    agendaOnline: boolean;
    fichaClinica: boolean;
    recordatoriosWhatsApp: boolean;
    multiRol: boolean;
    soporte: string;
  };
  highlighted: boolean;
}

export const landingPlans: LandingPlan[] = [
  {
    name: "Profesional",
    title: "Para doctores, dentistas y terapeutas independientes",
    priceMonthly: "1.2 UF",
    priceYearly: "0.95 UF",
    periodMonthly: "/mes",
    periodYearly: "/mes (facturado anual)",
    professionals: "1 profesional",
    features: {
      agendaOnline: true,
      fichaClinica: true,
      recordatoriosWhatsApp: false,
      multiRol: false,
      soporte: "Email y chat en horario hábil",
    },
    highlighted: false,
  },
  {
    name: "Clínica Pro",
    title: "Para consultas y centros de salud en crecimiento",
    priceMonthly: "2.8 UF",
    priceYearly: "2.2 UF",
    periodMonthly: "/mes",
    periodYearly: "/mes (facturado anual)",
    professionals: "Hasta 5 profesionales",
    features: {
      agendaOnline: true,
      fichaClinica: true,
      recordatoriosWhatsApp: true,
      multiRol: true,
      soporte: "Soporte prioritario WhatsApp y chat",
    },
    highlighted: true,
  },
  {
    name: "Centro Médico",
    title: "Para policlínicos y clínicas con alto volumen",
    priceMonthly: "5.5 UF",
    priceYearly: "4.4 UF",
    periodMonthly: "/mes",
    periodYearly: "/mes (facturado anual)",
    professionals: "Profesionales ilimitados",
    features: {
      agendaOnline: true,
      fichaClinica: true,
      recordatoriosWhatsApp: true,
      multiRol: true,
      soporte: "Onboarding 1 a 1 y soporte directo",
    },
    highlighted: false,
  },
];
