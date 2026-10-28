import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/ui";
import { PatientsTable, type ListPatient } from "./patients-table";

const PAGE_SIZE = 10;

export type PatientSort = "full_name" | "rut" | "birth_date" | "patient_status";

interface PatientsListProps {
  orgId: string;
  orgName: string;
  doctorId: string;
  clinical: boolean;
  q: string;
  status: string | null;
  tab: "all" | "favorites";
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
  orgName,
  doctorId,
  clinical,
  q,
  status,
  tab,
  page,
  sort,
  dir,
}: PatientsListProps) {
  const supabase = await supabaseServer();
  const offset = (page - 1) * PAGE_SIZE;

  let patients: ListPatient[] = [];
  let total = 0;
  let errorText: string | null = null;

  // 1. Obtener los IDs de pacientes favoritos del profesional actual
  const { data: favRows, error: favError } = await supabase
    .from("doctor_favorite_patients")
    .select("patient_id")
    .eq("doctor_id", doctorId);

  if (favError) {
    // Si falla la consulta de favoritos, no bloqueamos la lista
  }
  const favoriteIds = new Set((favRows ?? []).map((r) => r.patient_id));

  // Si estamos en la pestaña de favoritos y no hay ninguno marcado:
  if (tab === "favorites" && favoriteIds.size === 0) {
    return (
      <Card>
        <EmptyState
          icon={clinical ? "diente" : "correo"}
          title="No tienes pacientes favoritos"
          description="Marca pacientes con la estrella para acceder rápidamente a ellos desde esta pestaña."
        />
      </Card>
    );
  }

  if (clinical) {
    let query = supabase
      .from("patients")
      .select(
        "id,full_name,rut,phone,email,birth_date,sex,patient_status,doctors!patients_doctor_id_fkey(full_name)",
        { count: "exact" },
      )
      .eq("org_id", orgId);

    if (status) query = query.eq("patient_status", status);

    if (tab === "favorites") {
      query = query.in("id", Array.from(favoriteIds));
    }

    if (q) {
      const like = `%${q}%`;
      query = query.or(`full_name.ilike.${like},rut.ilike.${like},email.ilike.${like}`);
    }

    query = query
      .order(sort, { ascending: dir === "asc", nullsFirst: false })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    const { data, error, count } = await query;
    if (error) {
      errorText = error.message;
    } else {
      patients = (data ?? []).map((p) => ({
        ...p,
        is_favorite: favoriteIds.has(p.id),
      })) as ListPatient[];
      total = count ?? 0;
    }
  } else {
    const { data, error } = await supabase.rpc("list_patients_contact", {
      p_q: q || null,
      p_status: status,
      p_limit: tab === "favorites" ? 100 : PAGE_SIZE,
      p_offset: tab === "favorites" ? 0 : offset,
      p_sort: sort,
      p_dir: dir,
    });
    if (error) {
      errorText = error.message;
    } else {
      let rows = (data ?? []) as (ListPatient & { total?: number | string })[];
      if (tab === "favorites") {
        rows = rows.filter((r) => favoriteIds.has(r.id));
        total = rows.length;
        patients = rows
          .slice(offset, offset + PAGE_SIZE)
          .map((r) => ({ ...r, is_favorite: true }));
      } else {
        total = rows.length ? Number(rows[0].total ?? 0) : 0;
        patients = rows.map((r) => ({
          ...r,
          is_favorite: favoriteIds.has(r.id),
        }));
      }
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (errorText) {
    return <p className="text-sm text-action-primary">{errorText}</p>;
  }

  if (total === 0) {
    return (
      <Card>
        <EmptyState
          icon={clinical ? "diente" : "correo"}
          title={tab === "favorites" ? "Sin resultados en favoritos" : "No hay pacientes"}
          description={
            q || status
              ? "Ningún paciente coincide con la búsqueda."
              : tab === "favorites"
                ? "No tienes pacientes favoritos marcados aún."
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
            href={tab === "favorites" ? "/dashboard/pacientes?tab=favorites" : "/dashboard/pacientes"}
            className="font-medium text-action-primary underline-offset-2 hover:underline"
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
      params={{ q, status: status ?? "", sort, dir, tab }}
      orgName={orgName}
    />
  );
}
