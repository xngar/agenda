import { NextResponse } from "next/server";
import { z } from "zod";
import { getDoctorSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DEFAULT_TIMEZONE } from "@/lib/dates";
import { DEFAULT_AVAILABILITY, DEFAULT_SERVICES } from "@/lib/defaults";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Identificadores que ya ocupan una ruta estática del sitio. Un slug con
 * estos valores dejaría la clínica inalcanzable en `/{slug}`, así que se
 * rechazan al crear la organización.
 */
const RESERVED_SLUGS = new Set([
  "reservar",
  "privacidad",
  "cita",
  "dashboard",
  "api",
  "plataforma",
  "login",
  "_next",
]);

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
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(40).optional(),
  supportEmail: z.string().trim().toLowerCase().email("Correo de soporte inválido").optional(),
  consentText: z.string().trim().max(2000).optional(),
  adminFullName: z.string().trim().min(3, "Indica el nombre del administrador").max(120),
  adminEmail: z.string().trim().toLowerCase().email("Correo del administrador inválido"),
  adminPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
  adminSpecialty: z.string().trim().max(80).optional(),
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
    address,
    phone,
    supportEmail,
    consentText,
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
      address: address || null,
      phone: phone || null,
      support_email: supportEmail || null,
      consent_text: consentText || null,
    })
    .select("id,name,slug,timezone,active")
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
 * Se niega si la organización tiene citas: el historial no se borra, sólo se
 * deja de publicar la clínica. También se niega si es la organización desde
 * la que opera el propio equipo de la plataforma.
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

  if (citas) {
    return NextResponse.json(
      {
        error: "Tiene citas registradas: para que deje de ofrecer horas, desactívala en su lugar.",
        code: "tiene_citas",
      },
      { status: 409 },
    );
  }

  const { data: profesionales } = await supabase
    .from("doctors")
    .select("id")
    .eq("org_id", org.id);

  const borrados: { tabla: string; etiqueta: string }[] = [
    { tabla: "availability_rules", etiqueta: "el horario" },
    { tabla: "clinic_holidays", etiqueta: "los feriados" },
    { tabla: "time_off", etiqueta: "las ausencias" },
    { tabla: "notifications", etiqueta: "las notificaciones" },
    { tabla: "services", etiqueta: "los servicios" },
    { tabla: "doctors", etiqueta: "los profesionales" },
  ];

  for (const paso of borrados) {
    const { error } = await supabase.from(paso.tabla).delete().eq("org_id", org.id);
    if (error) {
      return NextResponse.json(
        { error: `No se pudo eliminar ${paso.etiqueta}`, code: "borrado_parcial" },
        { status: 500 },
      );
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