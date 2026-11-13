import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const bodySchema = z.object({
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(72, "La contraseña es demasiado larga"),
});

/**
 * Actualiza la contraseña del usuario autenticado en la sesión de recuperación.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Contraseña inválida" },
      { status: 400 },
    );
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        error:
          "La sesión de recuperación ha expirado o no es válida. Por favor solicita un nuevo enlace.",
      },
      { status: 401 },
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "No se pudo actualizar la contraseña" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}

