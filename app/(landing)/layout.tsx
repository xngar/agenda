import type { Metadata, Viewport } from "next";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  ),
  title: {
    default: `${siteConfig.name} · Agenda, fichas clínicas y pacientes en un solo lugar`,
    template: `%s · ${siteConfig.name}`,
  },
  description:
    `${siteConfig.name}: reservas online, ficha clínica por especialidad y recordatorios por WhatsApp para clínicas y profesionales de la salud.`,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: siteConfig.name,
    title: `${siteConfig.name} · Agenda, fichas clínicas y pacientes en un solo lugar`,
    description:
      `${siteConfig.name}: reservas online, ficha clínica por especialidad y recordatorios por WhatsApp para clínicas y profesionales de la salud.`,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B2A5B",
};

export default function LandingRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-landing="true" className="flex min-h-screen flex-col">
      {children}
    </div>
  );
}
