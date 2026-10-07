import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  bodyError,
  dbError,
} from "@/lib/ficha/http";
import { patientBaseSchema } from "@/lib/ficha/schemas";

export async function GET(request: Request) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const status = searchParams.get("status");
  const limitRaw = Number(searchParams.get("limit") ?? 50);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 200);
  const offsetRaw = Number(searchParams.get("offset") ?? 0);
  const offset = Math.max(Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.floor(offsetRaw) : 0, 0);

  let query;
  if (ctx.clinical) {
    query = ctx.supabase.from("patients").select("id,full_name,rut,phone,email,birth_date,sex,patient_status,org_id,created_at");
    if (status === "active" || status === "inactive" || status === "abandoned") {
      query = query.eq("patient_status", status);
    }
  } else {
    const { data, error } = await ctx.supabase.rpc("list_patients_contact");
    if (error) return dbError(error);
    return NextResponse.json({ patients: data ?? [], limit, offset });
  }

  query = query.eq("org_id", ctx.session.orgId);
  if (q) {
    const like = `%${q}%`;
    query = query.or(`full_name.ilike.${like},rut.ilike.${like},email.ilike.${like}`);
  }

  query = query.order("full_name").range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return dbError(error);

  return NextResponse.json({ patients: data ?? [], count, limit, offset });
}

export async function POST(request: Request) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const raw = await request.json().catch(() => null);
  const body = patientBaseSchema.safeParse(raw);
  if (!body.success) return bodyError(body.error);

  const data = body.data;
  const compuesto =
    [data.nombres, data.apellido_paterno, data.apellido_materno]
      .filter(Boolean)
      .join(" ")
      .trim() || null;
  const fullName = data.full_name ?? compuesto;

  const { data: creado, error } = await ctx.supabase
    .from("patients")
    .insert({
      org_id: ctx.session.orgId,
      full_name: fullName,
      ...data,
      specialty_profile: data.specialty_profile ?? {},
    })
    .select()
    .single();

  if (error) return dbError(error);

  return NextResponse.json({ patient: creado }, { status: 201 });
}