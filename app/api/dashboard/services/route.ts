import { NextResponse } from "next/server";
import { z } from "zod";
import { getDoctorSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { serviceSchema, serviceUpdateSchema, uuidSchema } from "@/lib/validation";
import { toBusinessError } from "@/lib/errors";

const createSchema = serviceSchema;

export async function GET() {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json(
      { error: "Solo un administrador puede gestionar servicios" },
      { status: 403 },
    );
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, duration_min, active")
    .eq("org_id", session.orgId)
    .order("name");

  if (error) {
    const business = toBusinessError(error);
    return NextResponse.json(
      { error: business.message, code: business.code },
      { status: business.status },
    );
  }

  return NextResponse.json({ services: data ?? [] });
}

export async function POST(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json(
      { error: "Solo un administrador puede gestionar servicios" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Revisa los datos" },
      { status: 422 },
    );
  }

  const { name, durationMin, active } = parsed.data;
  const supabase = await supabaseServer();

  const { data: exists } = await supabase
    .from("services")
    .select("id")
    .eq("org_id", session.orgId)
    .ilike("name", name.trim())
    .maybeSingle();

  if (exists) {
    return NextResponse.json(
      { error: "Ya existe un servicio con ese nombre en esta organización" },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from("services")
    .insert({
      org_id: session.orgId,
      name: name.trim(),
      duration_min: durationMin,
      active,
    })
    .select("id, name, duration_min, active")
    .single();

  if (error) {
    const business = toBusinessError(error);
    return NextResponse.json(
      { error: business.message, code: business.code },
      { status: business.status },
    );
  }

  return NextResponse.json({ service: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json(
      { error: "Solo un administrador puede gestionar servicios" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = serviceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Revisa los datos" },
      { status: 422 },
    );
  }

  const { serviceId, name, durationMin, active } = parsed.data;
  const supabase = await supabaseServer();

  const updates: Record<string, unknown> = {};
  if (typeof name === "string") updates.name = name.trim();
  if (typeof durationMin === "number") updates.duration_min = durationMin;
  if (typeof active === "boolean") updates.active = active;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No hay cambios para guardar" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("services")
    .update(updates)
    .eq("id", serviceId)
    .eq("org_id", session.orgId)
    .select("id, name, duration_min, active")
    .maybeSingle();

  if (error) {
    const business = toBusinessError(error);
    return NextResponse.json(
      { error: business.message, code: business.code },
      { status: business.status },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ service: data });
}

const deleteSchema = z.object({ serviceId: uuidSchema });

export async function DELETE(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json(
      { error: "Solo un administrador puede gestionar servicios" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Revisa los datos" },
      { status: 422 },
    );
  }

  const supabase = await supabaseServer();

  const { data: servicio } = await supabase
    .from("services")
    .select("id")
    .eq("id", parsed.data.serviceId)
    .eq("org_id", session.orgId)
    .maybeSingle();

  if (!servicio) {
    return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
  }

  const { data: enUso } = await supabase
    .from("appointments")
    .select("id")
    .eq("service_id", parsed.data.serviceId)
    .limit(1)
    .maybeSingle();

  if (enUso) {
    return NextResponse.json(
      { error: "Este servicio tiene citas asociadas. Desactívalo en vez de eliminarlo." },
      { status: 409 },
    );
  }

  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", parsed.data.serviceId)
    .eq("org_id", session.orgId);

  if (error) {
    if (error.code === "23503") {
      return NextResponse.json(
        { error: "Este servicio tiene citas asociadas. Desactívalo en vez de eliminarlo." },
        { status: 409 },
      );
    }
    const business = toBusinessError(error);
    return NextResponse.json(
      { error: business.message, code: business.code },
      { status: business.status },
    );
  }

  return NextResponse.json({ ok: true });
}
