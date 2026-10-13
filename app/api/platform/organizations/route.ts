import { NextResponse } from "next/server";
import { z } from "zod";
import { getDoctorSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DEFAULT_TIMEZONE } from "@/lib/dates";
import { DEFAULT_AVAILABILITY, DEFAULT_SERVICES } from "@/lib/defaults";
import { RESERVED_SLUGS, slugPattern } from "@/lib/platform";

const organizationSchema = z.object({
  name: z.string().trim().min(3, "El nombre es demasiado corto").max(120, "El nombre es demasiado largo"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "El identificador es demasiado corto")
    .max(50, "El identificador es demasiado largo")
    .regex(slugPattern, "Usa sólo letras minúsculas, números y guiones")
    .refine((slug) => !RESERVED_SLUGS.has(slug), "Ese identificador está reservado"),
  timezone: z.string().trim().min(1).default(DEFAULT_TIMEZONE),
  type: z.enum(["dental", "medical", "psychological"]).default("dental"),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(40).optional(),
  supportEmail: z.string().trim().toLowerCase().email("Correo de soporte inválido").optional(),
  consentText: z.string().trim().max(2000).optional(),
  professionalLimit: z
    .number()
    .int("El cupo debe ser un número entero")
    .min(2, "El cupo mínimo es 2 profesionales")
    .max(1000, "El cupo es demasiado alto")
    .nullable()
    .optional(),
  adminFullName: z.string().trim().min(3, "Indica el nombre del administrador").max(120),
  adminEmail: z.string().trim().toLowerCase().email("Correo del administrador inválido"),
  adminPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
  adminSpecialty: z.string().trim().max(80).optional(),
});

/** Campos editables de una organización existente (todos opcionales). */
const patchSchema = z
  .object({
    id: z.string().uuid("Organización inválida"),
    name: z.string().trim().min(3, "El nombre es demasiado corto").max(120, "El nombre es demasiado largo"),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "El identificador es demasiado corto")
      .max(50, "El identificador es demasiado largo")
      .regex(slugPattern, "Usa sólo letras minúsculas, números y guiones"),
    timezone: z.string().trim().min(1, "Indica la zona horaria"),
    type: z.enum(["dental", "medical", "psychological"]),
    address: z.string().trim().max(200).nullable(),
    phone: z.string().trim().max(40).nullable(),
    supportEmail: z.string().trim().toLowerCase().email("Correo de soporte inválido").nullable(),
    consentText: z.string().trim().max(2000).nullable(),
    professionalLimit: z
      .number()
      .int("El cupo debe ser un número entero")
      .min(2, "El cupo mínimo es 2 profesionales")
      .max(1000, "El cupo es demasiado alto")
      .nullable(),
    active: z.boolean(),
  })
  .partial()
  .extend({ id: z.string().uuid("Organización inválida") })
  .refine((v) => Object.keys(v).some((key) => key !== "id"), {
    message: "No hay nada que actualizar",
  });

/** Sólo el equipo de la plataforma administra organizaciones. */
async function plataformaAdmin(
  supabase: ReturnType<typeof supabaseAdmin>,
  doctorId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("doctors")
    .select("is_super_admin")
    .eq("id", doctorId)
    .maybeSingle();
  return Boolean(data?.is_super_admin);
}

export async function POST(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  const supabase = supabaseAdmin();
  if (!(await plataformaAdmin(supabase, session.id))) {
    return NextResponse.json(
      { error: "Sólo el equipo de la plataforma puede crear organizaciones" },
      { status: 403 },
    );
  }

  const raw = await request.json().catch(() => null);
  const body = organizationSchema.safeParse(raw);
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? "Revisa los datos" },
      { status: 422 },
    );
  }

  const {
    name,
    slug,
    timezone,
    type,
    address,
    phone,
    supportEmail,
    consentText,
    professionalLimit,
    adminFullName,
    adminEmail,
    adminPassword,
    adminSpecialty,
  } = body.data;

  // 1) Cuenta de acceso primero: es lo que más suele fallar (correo ya
  //    registrado) y así no dejamos una organización huérfana.
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: adminFullName },
  });

  if (authError || !authUser.user) {
    const alreadyExists = authError?.status === 422 || /already|registrad|exists/i.test(authError?.message ?? "");
    return NextResponse.json(
      {
        error: alreadyExists
          ? "Ese correo ya tiene una cuenta; usa otro distinto."
          : "No se pudo crear la cuenta del administrador",
        code: alreadyExists ? "correo_duplicado" : undefined,
      },
      { status: alreadyExists ? 409 : 500 },
    );
  }

  const userId = authUser.user.id;

  // 2) Organización.
  const { data: creada, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name,
      slug,
      timezone,
      type,
      address: address || null,
      phone: phone || null,
      support_email: supportEmail || null,
      consent_text: consentText || null,
      // null explícito = sin límite; sólo la ausencia usa el 2 por defecto.
      professional_limit: professionalLimit === undefined ? 2 : professionalLimit,
    })
    .select("id,name,slug,timezone,type,active,professional_limit")
    .single();

  if (orgError || !creada) {
    // La organización no llegó a existir: sólo hay que deshacer el usuario.
    await supabase.auth.admin.deleteUser(userId);
    if (orgError?.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe una organización con ese identificador", code: "slug_duplicado" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "No se pudo crear la organización" }, { status: 500 });
  }

  const orgId = creada.id as string;

  // 3) Profesional administrador de la clínica.
  const { error: doctorError } = await supabase.from("doctors").insert({
    id: userId,
    full_name: adminFullName,
    specialty: adminSpecialty || null,
    is_admin: true,
    active: true,
    org_id: orgId,
  });

  if (doctorError) {
    await cleanupOrganization(supabase, { orgId, userId });
    return NextResponse.json({ error: "No se pudo crear el administrador de la clínica" }, { status: 500 });
  }

  // 4) Servicios y horario por defecto, para que la clínica sea usable
  //    desde el primer minuto (el admin los ajusta en el panel).
  const { error: servicesError } = await supabase
    .from("services")
    .insert(DEFAULT_SERVICES.map((service) => ({ ...service, active: true, org_id: orgId })));

  const availabilityRows = DEFAULT_AVAILABILITY.flatMap((rule) =>
    rule.windows.map(([start_time, end_time]) => ({
      doctor_id: userId,
      org_id: orgId,
      weekday: rule.weekday,
      start_time,
      end_time,
    })),
  );
  const { error: availabilityError } = await supabase
    .from("availability_rules")
    .insert(availabilityRows);

  if (servicesError || availabilityError) {
    await cleanupOrganization(supabase, { orgId, userId });
    return NextResponse.json(
      { error: "La clínica se creó a medias; vuelve a intentarlo" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { ok: true, organization: creada, admin: { email: adminEmail } },
    { status: 201 },
  );
}

/**
 * Elimina una clínica entera y todo lo que cuelga de ella.
 *
 * Sin `force` se niega si la organización tiene citas: el historial no se
 * borra, sólo se deja de publicar la clínica. Con `force: true` se borra
 * TODO (citas, pacientes, ficha, auditoría y cuentas), pensado para
 * clínicas de prueba o dadas de baja definitiva. También se niega si es la
 * organización desde la que opera el propio equipo de la plataforma.
 */
export async function DELETE(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  const supabase = supabaseAdmin();
  if (!(await plataformaAdmin(supabase, session.id))) {
    return NextResponse.json(
      { error: "Sólo el equipo de la plataforma puede eliminar organizaciones" },
      { status: 403 },
    );
  }

  const raw = await request.json().catch(() => null);
  const slug = typeof raw?.slug === "string" ? raw.slug.trim().toLowerCase() : "";
  if (!slug) {
    return NextResponse.json({ error: "Indica qué organización eliminar" }, { status: 422 });
  }
  const force = raw?.force === true;

  const { data: org } = await supabase
    .from("organizations")
    .select("id,name,slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!org) {
    return NextResponse.json(
      { error: "No existe una organización con ese identificador", code: "no_existe" },
      { status: 404 },
    );
  }

  if (org.slug === "plataforma") {
    return NextResponse.json(
      {
        error: "La organización interna de la plataforma no se puede eliminar",
        code: "organizacion_interna",
      },
      { status: 409 },
    );
  }

  if (org.id === session.orgId) {
    return NextResponse.json(
      {
        error: "Es la organización desde la que trabajas; no puedes eliminarla",
        code: "organizacion_propia",
      },
      { status: 409 },
    );
  }

  const { count: citas } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org.id);

  if (citas && !force) {
    return NextResponse.json(
      {
        error: "Tiene citas registradas: para que deje de ofrecer horas, desactívala en su lugar.",
        code: "tiene_citas",
      },
      { status: 409 },
    );
  }

  const orgId = org.id as string;

  const { data: profesionales } = await supabase
    .from("doctors")
    .select("id")
    .eq("org_id", orgId);

  async function borrarTabla(
    tabla: string,
    etiqueta: string,
  ): Promise<NextResponse | null> {
    const { error } = await supabase.from(tabla).delete().eq("org_id", orgId);
    if (error) {
      return NextResponse.json(
        { error: `No se pudo eliminar ${etiqueta}`, code: "borrado_parcial" },
        { status: 500 },
      );
    }
    return null;
  }

  if (force) {
    // Borrado total en orden de dependencias: primero los hijos sin org_id
    // propio (tokens), luego la ficha, la agenda, los pacientes, la
    // configuración y al final las personas y la auditoría que los registra.
    const { data: citasOrg } = await supabase
      .from("appointments")
      .select("id")
      .eq("org_id", org.id);
    const citaIds = (citasOrg ?? []).map((c) => c.id as string);
    if (citaIds.length > 0) {
      const { error } = await supabase
        .from("manage_token_secrets")
        .delete()
        .in("appointment_id", citaIds);
      if (error) {
        return NextResponse.json(
          { error: "No se pudieron eliminar los tokens de gestión", code: "borrado_parcial" },
          { status: 500 },
        );
      }
    }

    const borradoTotal: { tabla: string; etiqueta: string }[] = [
      { tabla: "notifications", etiqueta: "las notificaciones" },
      { tabla: "encounter_versions", etiqueta: "el historial de la ficha" },
      { tabla: "attachments", etiqueta: "los adjuntos" },
      { tabla: "consents", etiqueta: "los consentimientos" },
      { tabla: "prescriptions", etiqueta: "las recetas" },
      { tabla: "dental_chart_entries", etiqueta: "el odontograma" },
      { tabla: "dental_treatment_plan_items", etiqueta: "el plan de tratamiento" },
      { tabla: "periodontal_records", etiqueta: "los registros periodontales" },
      { tabla: "patient_medical_background", etiqueta: "los antecedentes" },
      { tabla: "encounters", etiqueta: "las atenciones" },
      { tabla: "appointments", etiqueta: "las citas" },
      { tabla: "patients", etiqueta: "los pacientes" },
      { tabla: "availability_rules", etiqueta: "el horario" },
      { tabla: "clinic_holidays", etiqueta: "los feriados" },
      { tabla: "time_off", etiqueta: "las ausencias" },
      { tabla: "dental_payments", etiqueta: "los pagos" },
      { tabla: "dental_treatments_catalog", etiqueta: "el catálogo" },
      { tabla: "services", etiqueta: "los servicios" },
      { tabla: "doctors", etiqueta: "los profesionales" },
      { tabla: "audit_log", etiqueta: "la auditoría" },
    ];

    for (const paso of borradoTotal) {
      const fallo = await borrarTabla(paso.tabla, paso.etiqueta);
      if (fallo) return fallo;
    }
  } else {
    const borrados: { tabla: string; etiqueta: string }[] = [
      { tabla: "availability_rules", etiqueta: "el horario" },
      { tabla: "clinic_holidays", etiqueta: "los feriados" },
      { tabla: "time_off", etiqueta: "las ausencias" },
      { tabla: "notifications", etiqueta: "las notificaciones" },
      { tabla: "dental_payments", etiqueta: "los pagos" },
      { tabla: "services", etiqueta: "los servicios" },
      { tabla: "doctors", etiqueta: "los profesionales" },
    ];

    for (const paso of borrados) {
      const fallo = await borrarTabla(paso.tabla, paso.etiqueta);
      if (fallo) return fallo;
    }
  }

  const { error: orgError } = await supabase
    .from("organizations")
    .delete()
    .eq("id", org.id);

  if (orgError) {
    return NextResponse.json(
      { error: "No se pudo eliminar la organización", code: "borrado_parcial" },
      { status: 500 },
    );
  }

  // Sin fila de doctor, esa cuenta de acceso ya no puede entrar a ningún lado.
  for (const profesional of profesionales ?? []) {
    await supabase.auth.admin.deleteUser(profesional.id);
  }

  return NextResponse.json({ ok: true, organization: org });
}

/**
 * Actualiza los datos generales de una organización: nombre, identificador
 * (URL pública), zona horaria, contacto, consentimiento y estado activa.
 */
export async function PATCH(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  const supabase = supabaseAdmin();
  if (!(await plataformaAdmin(supabase, session.id))) {
    return NextResponse.json(
      { error: "Sólo el equipo de la plataforma puede editar organizaciones" },
      { status: 403 },
    );
  }

  const raw = await request.json().catch(() => null);
  const body = patchSchema.safeParse(raw);
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? "Revisa los datos" },
      { status: 422 },
    );
  }

  const { id, supportEmail, consentText, professionalLimit, ...rest } = body.data;

  const { data: org } = await supabase
    .from("organizations")
    .select("id,name,slug,type")
    .eq("id", id)
    .maybeSingle();

  if (!org) {
    return NextResponse.json(
      { error: "No existe esa organización", code: "no_existe" },
      { status: 404 },
    );
  }

  const cambiaTipo =
    rest.type !== undefined && rest.type !== (org.type as string | undefined);

  if (rest.slug !== undefined && rest.slug !== org.slug) {
    if (RESERVED_SLUGS.has(rest.slug)) {
      return NextResponse.json(
        { error: "Ese identificador está reservado", code: "slug_reservado" },
        { status: 422 },
      );
    }

    const { data: choque } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", rest.slug)
      .maybeSingle();
    if (choque) {
      return NextResponse.json(
        { error: "Ya existe otra organización con ese identificador", code: "slug_duplicado" },
        { status: 409 },
      );
    }
  }

  const update: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() };
  if (supportEmail !== undefined) update.support_email = supportEmail;
  if (consentText !== undefined) update.consent_text = consentText;
  if (professionalLimit !== undefined) update.professional_limit = professionalLimit;

  const { data: actualizada, error: updateError } = await supabase
    .from("organizations")
    .update(update)
    .eq("id", id)
    .select("id,name,slug,timezone,type,address,phone,support_email,consent_text,active,created_at,updated_at,professional_limit")
    .single();

  if (updateError) {
    if (updateError.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe otra organización con ese identificador", code: "slug_duplicado" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "No se pudo actualizar la organización" }, { status: 500 });
  }

  if (cambiaTipo) {
    // Los datos de especialidad pertenecen al tipo anterior y dejan de tener
    // sentido: se borran (decisión confirmada con la clínica). La ficha común
    // — pacientes, citas, atenciones — se conserva intacta.
    await supabase.from("patients").update({ specialty_profile: {} }).eq("org_id", id);
    await supabase.from("encounters").update({ specialty_data: {} }).eq("org_id", id);
    await supabase.from("audit_log").insert({
      org_id: id,
      actor_id: session.id,
      action: "update",
      entity: "organization",
      entity_id: id,
      summary: { type_change: { from: org.type, to: rest.type }, specialty_data_wiped: true },
    });
  }

  return NextResponse.json({ ok: true, organization: actualizada });
}

/**
 * Revierte una creación a medias. Cada paso es best-effort: si algo falla
 * no queremos enmascarar el error original, sólo evitar dejar basura.
 */
async function cleanupOrganization(
  supabase: ReturnType<typeof supabaseAdmin>,
  { orgId, userId }: { orgId?: string; userId?: string },
): Promise<void> {
  if (orgId) {
    await supabase.from("availability_rules").delete().eq("org_id", orgId);
    await supabase.from("doctors").delete().eq("org_id", orgId);
    await supabase.from("services").delete().eq("org_id", orgId);
    await supabase.from("organizations").delete().eq("id", orgId);
  }
  if (userId) {
    await supabase.auth.admin.deleteUser(userId);
  }
}