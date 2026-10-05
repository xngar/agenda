/**
 * Verificación del panel del profesional contra el servidor real y la base real.
 * Comprueba que el proxy bloquea, que el login deja sesión, que RLS aísla y
 * que los cambios de estado funcionan.
 */
const BASE = process.env.BASE ?? "http://localhost:3111";
const SERVICE = "dccfd3d6-7e66-460b-93ce-989ecbfe270f";
const SEBASTIAN = "3a335e2c-9881-473a-a98c-94c3661b977e";
const CAMILA = "d4555fbf-7e8a-4f6d-901c-d6f2b410c55b";
const slotDate = "2026-10-08";

let pass = 0,
  fail = 0;
function check(name, ok, detail = "") {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}${detail ? ` -> ${detail}` : ""}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? ` -> ${detail}` : ""}`);
  }
}

/** Cookie jar mínimo: guarda todos los Set-Cookie y los reenvía. */
function jar() {
  const cookies = new Map();
  return {
    absorb(res) {
      const raw = res.headers.getSetCookie?.() ?? [];
      for (const c of raw) {
        const [pair] = c.split(";");
        const idx = pair.indexOf("=");
        cookies.set(pair.slice(0, idx), pair.slice(idx + 1));
      }
    },
    header() {
      return [...cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    size: () => cookies.size,
  };
}

async function req(cookies, path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    redirect: "manual",
    headers: {
      Accept: "text/html,application/json",
      ...(cookies ? { Cookie: cookies.header() } : {}),
      ...init.headers,
    },
  });
  cookies?.absorb(res);
  const text = await res.text();
  return { status: res.status, location: res.headers.get("location"), text };
}

const hoy = await (async () => {
  const slots = await (
    await fetch(`${BASE}/api/slots?date=${slotDate}&serviceId=${SERVICE}`)
  ).json();
  return { slots: slots.slots ?? [] };
})();

console.log("[1] El proxy bloquea el panel sin sesión");
{
  const anon = jar();
  const r = await req(anon, "/dashboard");
  check(
    "/dashboard redirige al login sin sesión",
    r.status >= 300 && r.status < 400 && (r.location ?? "").includes("/dashboard/login"),
    `status=${r.status} location=${r.location}`,
  );
  const r2 = await req(anon, "/dashboard/admin");
  check(
    "/dashboard/admin también redirige",
    r2.status >= 300 && r2.status < 400,
    `status=${r2.status}`,
  );
  // El login SÍ debe ser accesible sin sesión.
  const r3 = await req(anon, "/dashboard/login");
  check("/dashboard/login es público", r3.status === 200, `status=${r3.status}`);
}

console.log("\n[2] Credenciales inválidas no abren sesión");
{
  const anon = jar();
  const r = await req(anon, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "camila.rojas@clinicadental.test", password: "incorrecta" }),
  });
  check("contraseña incorrecta da 401", r.status === 401, `status=${r.status}`);
  check(
    "el mensaje no revela si el correo existe",
    r.text.includes("Correo o contraseña incorrectos"),
    r.text.slice(0, 80),
  );
}

console.log("\n[3] Login real de la administradora");
const admin = jar();
{
  const r = await req(admin, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "camila.rojas@clinicadental.test",
      password: "AgendaDev2026!",
    }),
  });
  check("login 200", r.status === 200, `status=${r.status} ${r.text.slice(0, 90)}`);
  check("se guardaron cookies de sesión", admin.size() > 0, `${admin.size()} cookies`);
}
{
  const r = await req(admin, "/dashboard");
  check("/dashboard ahora responde 200", r.status === 200, `status=${r.status}`);
  check("muestra el nombre de la profesional", r.text.includes("Camila Rojas"));
  check("la agenda se renderiza", r.text.includes("Agenda"));
  const loginRedirect = await req(admin, "/dashboard/login");
  check(
    "ya autenticado, /login redirige al panel",
    loginRedirect.status >= 300 && loginRedirect.status < 400,
    `status=${loginRedirect.status}`,
  );
  const adminPage = await req(admin, "/dashboard/admin");
  check("la admin entra a /dashboard/admin", adminPage.status === 200, `status=${adminPage.status}`);
  check("la admin ve su nombre y el equipo", adminPage.text.includes("Camila Rojas"));
}

console.log("\n[4] Login de un profesional sin permisos de admin");
const doc = jar();
{
  const r = await req(doc, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "sebastian.munoz@clinicadental.test",
      password: "AgendaDev2026!",
    }),
  });
  check("login del profesional 200", r.status === 200, `status=${r.status}`);
  const page = await req(doc, "/dashboard");
  check("el profesional entra a su agenda", page.status === 200, `status=${page.status}`);
  const adminPage = await req(doc, "/dashboard/admin");
  check(
    "un profesional NO puede ver /dashboard/admin",
    adminPage.status >= 300 && adminPage.status < 400,
    `status=${adminPage.status} location=${adminPage.location}`,
  );
  check(
    "su navegación no muestra el enlace Equipo",
    !page.text.includes('href="/dashboard/admin"'),
  );
}

console.log("\n[5] Aislamiento por RLS entre profesionales");
{
  const email = `panel.${Date.now()}@test.cl`;
  // La cita se reserva para CAMILA, no para Sebastián. Así "Sebastián no
  // puede tocarla" es una prueba real de aislamiento entre profesionales.
  const slot = hoy.slots.find((s) => s.doctor_id !== SEBASTIAN) ?? hoy.slots[0];
  check("hay un slot de otro profesional", Boolean(slot?.doctor_id), slot?.doctor_id);
  const booked = await req(null, "/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serviceId: SERVICE,
      doctorId: slot.doctor_id,
      slotStart: slot.slot_start,
      fullName: "Paciente Panel",
      rut: "12345678-5",
      phone: "+56900000001",
      email,
      consent: true,
    }),
  });
  check("cita creada para probar el panel", booked.status === 201, `status=${booked.status}`);

  const body = JSON.parse(booked.text);

  // Camila es admin: debe ver la cita de otro profesional.
  // OJO: se busca el NOMBRE del paciente, no el id. El id se usa como
  // `key` de React y nunca aparece en el HTML, así que buscarlo daría
  // siempre "no visible" y la prueba no significaría nada.
  for (const [nombre, cookies, deberiaVer] of [
    ["Camila (admin)", admin, true],
    ["Sebastián (no admin)", doc, false],
  ]) {
    const r = await req(
      cookies,
      `/dashboard?date=${slot.slot_start.slice(0, 10)}&doctor=${slot.doctor_id}`,
    );
    // Si la consulta a la base falla, la página lo muestra como aviso y la
    // agenda queda vacía. Antes daba un falso "todo bien" porque sólo se
    // buscaba el nombre del paciente.
    check(
      "la agenda carga sin errores",
      !r.text.includes("No pudimos cargar la agenda"),
      r.text.includes("No pudimos cargar la agenda")
        ? r.text.slice(r.text.indexOf("No pudimos cargar la agenda"), r.text.indexOf("No pudimos cargar la agenda") + 120)
        : "",
    );
    const visible = r.status === 200 && r.text.includes("Paciente Panel");
    check(`${nombre} ${deberiaVer ? "ve" : "no ve"} la cita ajena`, visible === deberiaVer, `status=${r.status}`);
  }

  // Confirmar una cita pendiente: el botón sólo existe mientras el estado
  // es `pending`.
  const urlAgenda = `/dashboard?date=${slot.slot_start.slice(0, 10)}&doctor=${slot.doctor_id}`;
  const antesDeConfirmar = await req(admin, urlAgenda);
  check(
    "una cita pendiente ofrece el botón Confirmar",
    antesDeConfirmar.text.includes("Confirmar"),
    `status=${antesDeConfirmar.status}`,
  );

  const confirmada = await req(admin, "/api/dashboard/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appointmentId: body.appointmentId, action: "confirmed" }),
  });
  check(
    "el admin confirma la cita pendiente",
    confirmada.status === 200 && confirmada.text.includes('"confirmed"'),
    `status=${confirmada.status} ${confirmada.text.slice(0, 80)}`,
  );

  const despuesDeConfirmar = await req(admin, urlAgenda);
  check(
    "ya confirmada, el botón Confirmar desaparece",
    !despuesDeConfirmar.text.includes("Confirmar"),
    `status=${despuesDeConfirmar.status}`,
  );

  // Sebastián intenta tocar una cita que no es suya.
  const ajeno = await req(doc, "/api/dashboard/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appointmentId: body.appointmentId, action: "completed" }),
  });
  // Se aceptan 403 y 404: RLS impide que la fila sea legible, así que el
  // servidor responde 404 y ni siquiera confirma que la cita existe. Es
  // mejor que 403 desde el punto de vista de no filtrar información.
  check(
    "no se puede tocar una cita de otro profesional",
    ajeno.status === 403 || ajeno.status === 404,
    `status=${ajeno.status} ${ajeno.text.slice(0, 80)}`,
  );

  // El admin sí puede.
  const ok = await req(admin, "/api/dashboard/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appointmentId: body.appointmentId, action: "completed" }),
  });
  check("el admin sí completa la cita", ok.status === 200, `status=${ok.status} ${ok.text.slice(0, 80)}`);

  // Estados inválidos contra el CHECK de la base.
  const malo = await req(admin, "/api/dashboard/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appointmentId: body.appointmentId, action: "inventado" }),
  });
  check("un estado inexistente da 400", malo.status === 400, `status=${malo.status}`);

  // Sin sesión.
  const anon = jar();
  const sinSesion = await req(anon, "/api/dashboard/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appointmentId: body.appointmentId, action: "completed" }),
  });
  check("sin sesión da 401", sinSesion.status === 401, `status=${sinSesion.status}`);

  // Limpieza.
  const cleanup = await req(admin, "/api/dashboard/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appointmentId: body.appointmentId, action: "cancelled" }),
  });
  console.log(`  (cita ${body.appointmentId.slice(0, 8)} cancelada para limpiar: ${cleanup.status})`);
}

console.log("\n[6] Activar y desactivar cuentas del equipo");
{
  const anon = jar();
  const patch = (cookies, body) =>
    req(cookies, "/api/dashboard/doctors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const sinSesion = await patch(anon, { doctorId: SEBASTIAN, active: false });
  check("sin sesión da 401", sinSesion.status === 401, `status=${sinSesion.status}`);

  const noAdmin = await patch(doc, { doctorId: SEBASTIAN, active: false });
  check(
    "un profesional NO puede desactivar cuentas",
    noAdmin.status === 403,
    `status=${noAdmin.status} ${noAdmin.text.slice(0, 80)}`,
  );

  // Desactivarse a sí mismo sería un cierre de sesión irreversible: el
  // login exige `active`.
  const auto = await patch(admin, { doctorId: CAMILA, active: false });
  check(
    "el admin no puede desactivar su propia cuenta",
    auto.status === 409,
    `status=${auto.status} ${auto.text.slice(0, 90)}`,
  );

  const baja = await patch(admin, { doctorId: SEBASTIAN, active: false });
  check(
    "el admin sí desactiva a otro profesional",
    baja.status === 200 && baja.text.includes('"active":false'),
    `status=${baja.status} ${baja.text.slice(0, 80)}`,
  );

  // Un profesional desactivado desaparece del asistente público.
  const agendaPublica = await (
    await fetch(`${BASE}/api/slots?date=${slotDate}&serviceId=${SERVICE}&doctorId=${SEBASTIAN}`)
  ).json();
  check(
    "el profesional desactivado no ofrece horas",
    (agendaPublica.slots ?? []).length === 0,
    `${(agendaPublica.slots ?? []).length} slots`,
  );

  const alta = await patch(admin, { doctorId: SEBASTIAN, active: true });
  check(
    "y lo puede volver a activar (limpieza)",
    alta.status === 200 && alta.text.includes('"active":true'),
    `status=${alta.status} ${alta.text.slice(0, 80)}`,
  );

  const pagina = await req(admin, "/dashboard/admin");
  check(
    "la vista de equipo muestra el botón de acción",
    pagina.status === 200 && pagina.text.includes("Desactivar"),
    `status=${pagina.status}`,
  );
}

console.log("\n[7] Logout");
{
  const r = await req(admin, "/api/auth/logout", { method: "POST" });
  check("logout responde 303", r.status === 303, `status=${r.status}`);
  const after = await req(admin, "/dashboard");
  check(
    "tras salir, /dashboard vuelve a bloquear",
    after.status >= 300 && after.status < 400,
    `status=${after.status}`,
  );
}

console.log(`\n== ${pass} pass, ${fail} fail ==`);
process.exit(fail ? 1 : 0);