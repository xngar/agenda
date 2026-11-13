import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, clientIdentity } from "@/lib/ratelimit";
import { supabaseServer } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";

const bodySchema = z.object({
  email: z.string().trim().email("Ingresa un correo electrónico válido"),
});

/**
 * Solicitud de recuperación de contraseña institucional.
 *
 * Utiliza el flujo de Supabase Auth (`resetPasswordForEmail`).
 * Aplica rate limiting por IP/identidad para prevenir abusos.
 * Responde siempre con éxito para evitar la enumeración de usuarios.
 */
export async function POST(request: Request) {
  const limit = await checkRateLimit("forgot-password", clientIdentity(request), {
    requests: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (limit && !limit.available) {
    return NextResponse.json(
      { error: "El servicio no está disponible temporalmente." },
      { status: 503 },
    );
  }

  if (limit && !limit.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos antes de volver a intentar." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Correo inválido" },
      { status: 400 },
    );
  }

  try {
    const supabase = await supabaseServer();
    const appUrl = serverEnv().NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectTo = `${appUrl}/dashboard/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo,
    });

    if (error) {
      console.warn("[auth/recuperar] Supabase reset error:", error.message);
    }
  } catch (err) {
    console.error("[auth/recuperar] Error inesperado:", err);
  }

  return NextResponse.json({
    ok: true,
    message:
      "Si el correo corresponde a una cuenta activa, recibirás un enlace para restablecer tu contraseña.",
  });
}

