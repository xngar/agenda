import Link from "next/link";
import { redirect } from "next/navigation";
import { getDoctorSession, isClinical } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardHeader, EmptyState, buttonClasses } from "@/components/ui";
import { PatientsSearch } from "./patients-search";
import { NewPatientButton } from "./patient-form";

interface ListPatient {
  id: string;
  full_name: string;
  rut: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  sex: string | null;
  patient_status?: string | null;
  doctor?: { full_name: string } | null;
}

function formatRut(rut: string | null): string {
  if (!rut) return "—";
  return rut.length > 6 ? `${rut.slice(0, -1).replace(/(\d)(?=(\d{3})+$)/g, "$1.")}-${rut.slice(-1)}` : rut;
}

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await getDoctorSession();
  if (!session) redirect("/dashboard/login");
  const clinical = isClinical(session);
  const supabase = await supabaseServer();

  const { q: rawQ, status } = await searchParams;
  const q = (rawQ ?? "").trim();
  const stat = status === "active" || status === "inactive" || status === "abandoned" ? status : null;

  let patients: ListPatient[] = [];
  let errorText: string | null = null;

  if (clinical) {
    let query = supabase
      .from("patients")
      .select("id,full_name,rut,phone,email,birth_date,sex,patient_status,doctor_id,doctors!patients_doctor_id_fkey(full_name)")
      .eq("org_id", session.orgId);
    if (stat) query = query.eq("patient_status", stat);
    if (q) {
      const like = `%${q}%`;
      query = query.or(`full_name.ilike.${like},rut.ilike.${like},email.ilike.${like}`);
    }
    query = query.order("full_name").limit(100);
    const { data, error } = await query;
    if (error) errorText = error.message;
    else patients = (data ?? []) as ListPatient[];
  } else {
    const { data, error } = await supabase.rpc("list_patients_contact");
    if (error) errorText = error.message;
    else patients = (data ?? []) as ListPatient[];
  }

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
      ) : patients.length === 0 ? (
        <Card>
          <EmptyState
            icon={clinical ? "diente" : "correo"}
            title="No hay pacientes"
            description={
              q
                ? "Ningún paciente coincide con la búsqueda."
                : "Los pacientes aparecen acá cuando reservan por internet o los registras."
            }
          />
        </Card>
      ) : (
        <ul className="space-y-2">
          {patients.map((p) => (
            <li key={p.id}>
              <Link
                href={`/dashboard/pacientes/${p.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 transition-colors hover:border-brand-navy-200 hover:bg-brand-sky-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-900">{p.full_name}</p>
                  <p className="text-sm text-neutral-600">
                    {formatRut(p.rut)} {p.email ? `· ${p.email}` : ""}{" "}
                    {p.doctor?.full_name ? (
                      <span className="text-brand-navy-700">· Paciente de {p.doctor.full_name}</span>
                    ) : null}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm text-neutral-600">
                  {p.birth_date ? <span>{p.birth_date.slice(0, 10)}</span> : null}
                  {p.sex ? <span>{p.sex === "female" ? "M" : p.sex === "male" ? "H" : "—"}</span> : null}
                  {p.patient_status && p.patient_status !== "active" ? (
                    <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
                      {p.patient_status}
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}