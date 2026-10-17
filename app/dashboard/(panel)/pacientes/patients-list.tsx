import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/ui";
import { PatientsTable, type ListPatient } from "./patients-table";

const PAGE_SIZE = 10;

export type PatientSort = "full_name" | "rut" | "birth_date" | "patient_status";

interface PatientsListProps {
  orgId: string;
  clinical: boolean;
  q: string;
  status: string | null;
  page: number;
  sort: PatientSort;
  dir: "asc" | "desc";
}

/**
 * Resultados del listado de pacientes. Se renderiza dentro de un `Suspense` para
 * que la búsqueda, la paginación y el orden muestren la silueta en vez de dejar
 * la tabla anterior en pantalla.
 */
export async function PatientsList({
  orgId,
  clinical,
  q,
  status,
  page,
  sort,
  dir,
}: PatientsListProps) {
  const supabase = await supabaseServer();
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
      .eq("org_id", orgId);
    if (status) query = query.eq("patient_status", status);
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
      p_status: status,
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

  if (errorText) {
    return <p className="text-sm text-brand-navy-900">{errorText}</p>;
  }

  if (total === 0) {
    return (
      <Card>
        <EmptyState
          icon={clinical ? "diente" : "correo"}
          title="No hay pacientes"
          description={
            q || status
              ? "Ningún paciente coincide con la búsqueda."
              : "Los pacientes aparecen acá cuando reservan por internet o los registras."
          }
        />
      </Card>
    );
  }

  if (patients.length === 0) {
    return (
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
    );
  }

  return (
    <PatientsTable
      patients={patients}
      total={total}
      page={page}
      totalPages={totalPages}
      params={{ q, status: status ?? "", sort, dir }}
    />
  );
}