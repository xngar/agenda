import Link from "next/link";
import { redirect } from "next/navigation";
import { getDoctorSession, isClinical } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardHeader, EmptyState, buttonClasses } from "@/components/ui";
import { PatientsSearch } from "./patients-search";
import { NewPatientButton } from "./patient-form";
import { PatientsTable, type ListPatient } from "./patients-table";

const PAGE_SIZE = 10;
const SORT_COLUMNS = ["full_name", "rut", "birth_date", "patient_status"] as const;

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; sort?: string; dir?: string }>;
}) {
  const session = await getDoctorSession();
  if (!session) redirect("/dashboard/login");
  const clinical = isClinical(session);
  const supabase = await supabaseServer();

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const stat = params.status === "active" || params.status === "inactive" || params.status === "abandoned" ? params.status : null;
  const page = Math.max(1, parseInt(params.page ?? "", 10) || 1);
  const sort = (SORT_COLUMNS as readonly string[]).includes(params.sort ?? "") ? (params.sort as (typeof SORT_COLUMNS)[number]) : "full_name";
  const dir: "asc" | "desc" = params.dir === "desc" ? "desc" : "asc";
  const offset = (page - 1) * PAGE_SIZE;

  let patients: ListPatient[] = [];
  let total = 0;
  let errorText: string | null = null;

  if (clinical) {
    let query = supabase
      .from("patients")
      .select(
        "id,full_name,rut,phone,email,birth_date,sex,patient_status,doctors!patients_doctor_id_fkey(full_name)",
        { count: "exact" },
      )
      .eq("org_id", session.orgId);
    if (stat) query = query.eq("patient_status", stat);
    if (q) {
      const like = `%${q}%`;
      query = query.or(`full_name.ilike.${like},rut.ilike.${like},email.ilike.${like}`);
    }
    query = query
      .order(sort, { ascending: dir === "asc", nullsFirst: false })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    const { data, error, count } = await query;
    if (error) errorText = error.message;
    else {
      patients = (data ?? []) as ListPatient[];
      total = count ?? 0;
    }
  } else {
    const { data, error } = await supabase.rpc("list_patients_contact", {
      p_q: q || null,
      p_status: stat,
      p_limit: PAGE_SIZE,
      p_offset: offset,
      p_sort: sort,
      p_dir: dir,
    });
    if (error) errorText = error.message;
    else {
      const rows = (data ?? []) as (ListPatient & { total?: number | string })[];
      patients = rows;
      total = rows.length ? Number(rows[0].total ?? 0) : 0;
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-brand-navy">Pacientes</h1>
          <p className="text-sm text-neutral-600">
            {clinical
              ? "Fichas clínicas de tu organización. Registra los tuyos y edita los que te pertenecen."
              : "Datos de contacto de tu organización (agenda y atención)."}
          </p>
        </div>
        {clinical ? <NewPatientButton /> : null}
      </div>

      <Card>
        <CardHeader
          title="Buscar pacientes"
          description="Por nombre, RUT o correo"
          action={<Link className={buttonClasses("secondary", "sm")} href="/dashboard/pacientes">Limpiar</Link>}
        />
        <div className="px-5 py-4">
          <PatientsSearch initialQ={q} initialStatus={stat} />
        </div>
      </Card>

      {errorText ? (
        <p className="text-sm text-brand-navy-900">{errorText}</p>
      ) : total === 0 ? (
        <Card>
          <EmptyState
            icon={clinical ? "diente" : "correo"}
            title="No hay pacientes"
            description={
              q || stat
                ? "Ningún paciente coincide con la búsqueda."
                : "Los pacientes aparecen acá cuando reservan por internet o los registras."
            }
          />
        </Card>
      ) : patients.length === 0 ? (
        <Card>
          <div className="space-y-2 p-5 text-sm text-neutral-600">
            <p>Esta página está vacía; hay {total} pacientes en total.</p>
            <Link
              href="/dashboard/pacientes"
              className="font-medium text-brand-navy-700 underline-offset-2 hover:underline"
            >
              Ir a la primera página
            </Link>
          </div>
        </Card>
      ) : (
        <PatientsTable
          patients={patients}
          total={total}
          page={page}
          totalPages={totalPages}
          params={{ q, status: stat ?? "", sort, dir }}
        />
      )}
    </div>
  );
}
