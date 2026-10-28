import type { Metadata, Viewport } from "next";
import { Figtree, Poppins } from "next/font/google";
import "./globals.css";
import { AppToaster } from "@/components/toaster";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins-family",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  ),
  title: {
    default: "Agenda online · Clínica odontológica",
    template: "%s · Clínica odontológica",
  },
  description:
    "Reserva tu hora en línea con los profesionales de nuestra clínica odontológica. Lunes a sábado, con confirmación inmediata por correo.",
  applicationName: "Agenda online odontológica",
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: "Clínica odontológica",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B3C7A",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" className={`${figtree.variable} ${poppins.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>
        <main id="contenido" className="flex flex-1 flex-col">
          {children}
        </main>
        <AppToaster />
      </body>
    </html>
  );
}