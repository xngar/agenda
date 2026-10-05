import "server-only";

import { Resend } from "resend";
import { serverEnv } from "@/lib/env";

/**
 * Envío de correos con Resend.
 *
 * Sin RESEND_API_KEY (dev) los correos se registran en consola y la
 * operación sigue: la reserva del paciente no puede depender de que un
 * SMTP de terceros esté vivo. En producción el `.env.example` la exige.
 */

let client: Resend | null = null;

function getClient(): Resend | null {
  const env = serverEnv();
  if (!env.RESEND_API_KEY) return null;
  client ??= new Resend(env.RESEND_API_KEY);
  return client;
}

export interface SendOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Archivo adjunto en claro, p. ej. el .ics de la cita. */
  attachments?: { filename: string; content: string | Buffer }[];
}

export type SendResult = { ok: true; skipped: boolean } | { ok: false; error: string };

export async function sendEmail(options: SendOptions): Promise<SendResult> {
  const env = serverEnv();
  const resend = getClient();

  if (!resend) {
    // Sin PII en el log: sólo el destinatario enmascarado.
    console.info("[email] modo dev, no enviado a", maskEmail(options.to), "|", options.subject);
    return { ok: true, skipped: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      ...(options.text ? { text: options.text } : {}),
      ...(options.attachments ? { attachments: options.attachments } : {}),
    });

    if (error) {
      console.warn("[email] Resend devolvió error:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, skipped: false };
  } catch (error) {
    console.warn("[email] fallo de red con Resend");
    return { ok: false, error: error instanceof Error ? error.message : "desconocido" };
  }
}

/** Nada de emails completos en los logs. */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  const head = local.slice(0, 2);
  return `${head}${"*".repeat(Math.max(local.length - 2, 1))}@${domain}`;
}