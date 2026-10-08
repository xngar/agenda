import { z } from "zod";
import { NextResponse } from "next/server";

const schema = z.object({
  nombre: z.string().min(1),
  correo: z.string().email(),
  telefono: z.string().min(1),
  tipo: z.string().min(1),
  profesionales: z.string().min(1),
  mensaje: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid" }, { status: 400 });
    }
    console.log("demo-submission", parsed.data);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Error" }, { status: 500 });
  }
}
