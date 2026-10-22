import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  bodyError,
  dbError,
  orgPatient,
  auditPatientView,
} from "@/lib/ficha/http";
import { paymentSchema } from "@/lib/ficha/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { patient, error: patientError } = await orgPatient(ctx, id);
  if (patientError) return patientError;

  const { data, error } = await ctx.supabase
    .from("dental_payments")
    .select("*")
    .eq("org_id", ctx.session.orgId)
    .eq("patient_id", id)
    .order("paid_at", { ascending: false });

  if (error) return dbError(error);
  const auditError = await auditPatientView(ctx, id, "dental_payments");
  if (auditError) return auditError;

  return NextResponse.json({ patient, payments: data ?? [] });
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { error: patientError } = await orgPatient(ctx, id);
  if (patientError) return patientError;

  const raw = await request.json().catch(() => null);
  const body = paymentSchema.omit({ patient_id: true }).safeParse(raw);
  if (!body.success) return bodyError(body.error);

  const { data, error } = await ctx.supabase
    .from("dental_payments")
    .insert({
      org_id: ctx.session.orgId,
      patient_id: id,
      plan_item_id: body.data.plan_item_id ?? null,
      amount: body.data.amount,
      paid_at: body.data.paid_at ?? new Date().toISOString().slice(0, 10),
      method: body.data.method ?? "efectivo",
      note: body.data.note ?? null,
      created_by: ctx.session.id,
    })
    .select()
    .single();

  if (error) return dbError(error);

  return NextResponse.json({ payment: data }, { status: 201 });
}
