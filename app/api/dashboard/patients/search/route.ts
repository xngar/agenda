import { NextResponse } from "next/server";
import { getDoctorSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

interface ContactRow {
  id: string;
  full_name: string;
  rut: string | null;
  phone: string | null;
  email: string | null;
}

/**
 * Buscador de pacientes para el wizard de reserva del equipo.
 *
 * Envuelve list_patients_contact (contacto, sin contenido clínico) con
 * un límite corto pensado para autocompletar. Cualquier rol del
 * dashboard puede usarlo: la organización se resuelve de la sesión.
 */
export async function GET(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ patients: [] });
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("list_patients_contact", {
    p_q: q,
    p_status: null,
    p_limit: 8,
    p_offset: 0,
    p_sort: "full_name",
    p_dir: "asc",
  });
  if (error) {
    return NextResponse.json({ error: "No pudimos buscar pacientes" }, { status: 500 });
  }

  const patients = ((data ?? []) as ContactRow[]).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    rut: p.rut,
    phone: p.phone,
    email: p.email,
  }));
  return NextResponse.json({ patients });
}
