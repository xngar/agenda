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

/** RUT válido y distinto en cada corrida (dígito verificador mod-11 con K). */
function rutUnico() {
  const base = String(Date.now()).slice(-8);
  let suma = 0;
  let factor = 2;
  for (let i = base.length - 1; i >= 0; i--) {
    suma += Number(base[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  const dv = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return `${base}-${dv}`;
}
const RUT_UNICO = rutUnico();

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
      rut: RUT_UNICO,
      phone: "+56900000001",
      email,
      consent: true,
    }),
  });
  check("cita creada para probar el panel", booked.status === 201, `status=${booked.status}`);

  const body = JSON.parse(booked.text);

  // La reserva online deja el paciente al médico que atendió la cita.
  const listaPac = await req(admin, `/api/ficha/patients?q=${encodeURIComponent("Paciente Panel")}&limit=20`);
  const propietario = (JSON.parse(listaPac.text).patients ?? []).find((p) => p.full_name === "Paciente Panel" && p.doctor_id === slot.doctor_id);
  check(
    "la reserva online asigna el paciente al médico de la cita",
    Boolean(propietario),
    propietario ? `doctor_id=${propietario.doctor_id}` : "sin coincidencia",
  );

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

  // Navegación de día. Sin esto, una cita reservada para mañana quedaba
  // invisible: la agenda abría en hoy, que estaba vacío, y no había forma de
  // cambiar de fecha.
  const hoyKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
  }).format(new Date());

  const agendaHoy = await req(admin, `/dashboard?doctor=${slot.doctor_id}`);
  check(
    "la agenda trae un selector de fecha",
    agendaHoy.text.includes('id="filtro-dia"'),
    `status=${agendaHoy.status}`,
  );

  const conNavegacion = await req(admin, `/dashboard?date=${slot.slot_start.slice(0, 10)}&doctor=${slot.doctor_id}`);
  check(
    "el selector de fecha muestra el día elegido",
    conNavegacion.text.includes(`value="${slot.slot_start.slice(0, 10)}"`),
    `status=${conNavegacion.status}`,
  );

  // El aviso sólo aplica si HOY está vacío: si hoy hay citas (la de un
  // paciente real, por ejemplo), la agenda las muestra y no hay nada que avisar.
  const hoyVacio = agendaHoy.text.includes("Sin citas para este día");
  check(
    "en un día vacío avisa que hay citas en otros días",
    hoyKey === slot.slot_start.slice(0, 10) || !hoyVacio
      ? true
      : agendaHoy.text.includes("Hay citas en los próximos días"),
    `hoy=${hoyKey} vacio=${hoyVacio}`,
  );

  check(
    "el resumen ofrece un salto al día con citas",
    agendaHoy.text.includes("por confirmar") || agendaHoy.text.includes('aria-label="Días con citas"'),
    "",
  );

  // Calendario mensual: el conmutador Día | Mes de la agenda.
  check(
    "la vista día ofrece pasar a la vista Mes",
    conNavegacion.text.includes("view=mes"),
    `status=${conNavegacion.status}`,
  );

  const mesKey = slot.slot_start.slice(0, 7);
  const vistaMes = await req(admin, `/dashboard?view=mes&month=${mesKey}&doctor=${slot.doctor_id}`);
  check(
    "la vista Mes carga sin errores",
    vistaMes.status === 200 && !vistaMes.text.includes("No pudimos cargar la agenda"),
    `status=${vistaMes.status}`,
  );

  // Requisito del producto: en el día de la reserva quedan marcados el
  // nombre del paciente y el horario registrado (chips de la grilla).
  const horaLocal = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(slot.slot_start));
  check(
    "el calendario mensual marca nombre y horario de la cita",
    vistaMes.status === 200 &&
      vistaMes.text.includes("Paciente Panel") &&
      vistaMes.text.includes(horaLocal) &&
      vistaMes.text.includes("data-cita") &&
      vistaMes.text.includes('aria-label="Calendario mensual"'),
    `status=${vistaMes.status} nombre=${vistaMes.text.includes("Paciente Panel")} hora=${horaLocal}`,
  );

  check(
    "el calendario ofrece volver a la vista Día",
    vistaMes.text.includes("/dashboard?date="),
    `status=${vistaMes.status}`,
  );

  // Navegación entre meses (el anterior calcula con aritmética de calendario
  // pura, igual que hace la UI con addMonthsToKey).
  const [mesAnio, mesNum] = mesKey.split("-").map(Number);
  const mesAnterior = new Date(Date.UTC(mesAnio, mesNum - 2, 1)).toISOString().slice(0, 10).slice(0, 7);
  const otroMes = await req(admin, `/dashboard?view=mes&month=${mesAnterior}&doctor=${slot.doctor_id}`);
  check("la grilla navega a otro mes", otroMes.status === 200, `status=${otroMes.status} mes=${mesAnterior}`);

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

console.log("\n[7] Horario semanal");
{
  const get = (cookies, doctorId) =>
    req(cookies, `/api/dashboard/availability${doctorId ? `?doctorId=${doctorId}` : ""}`);
  const post = (cookies, body) =>
    req(cookies, "/api/dashboard/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const regla = (weekday, startTime, endTime) => ({ weekday, startTime, endTime });
  const comoReglas = (rules) =>
    (rules ?? []).map((r) => regla(r.weekday, r.startTime, r.endTime));
  // `req` no parsea el cuerpo: lo hace aquí para no repetir try/catch.
  const json = (r) => {
    try {
      return JSON.parse(r.text);
    } catch {
      return {};
    }
  };

  // --- la página ---
  const anon = jar();
  const sinSesionPagina = await req(anon, "/dashboard/horario");
  check(
    "sin sesión, /dashboard/horario redirige al login",
    sinSesionPagina.status >= 300 && sinSesionPagina.status < 400,
    `status=${sinSesionPagina.status}`,
  );

  const pagina = await req(admin, "/dashboard/horario");
  check("la admin abre /dashboard/horario", pagina.status === 200, `status=${pagina.status}`);
  check("la página se titula Horario de atención", pagina.text.includes("Horario de atenci"));
  check(
    "la admin puede elegir a qué profesional editar",
    pagina.text.includes('id="filtro-doctor"'),
    `status=${pagina.status}`,
  );
  check(
    "avisa que los cambios no mueven las citas existentes",
    pagina.text.includes("afectan a reservas nuevas"),
    "",
  );

  const paginaProfe = await req(doc, "/dashboard/horario");
  check("el profesional abre su horario", paginaProfe.status === 200, `status=${paginaProfe.status}`);
  check(
    "un profesional NO ve el selector de equipo",
    !paginaProfe.text.includes('id="filtro-doctor"'),
    `status=${paginaProfe.status}`,
  );
  const paginaAjena = await req(doc, "/dashboard/horario?doctor=" + CAMILA);
  check(
    "?doctor= ajeno no filtra su vista (sigue siendo la suya)",
    paginaAjena.status === 200 && paginaAjena.text.includes("Sebasti"),
    `status=${paginaAjena.status}`,
  );

  // --- la API ---
  check("GET sin sesión da 401", (await get(anon)).status === 401, "");

  const originalResp = await get(admin, SEBASTIAN);
  const original = json(originalResp);
  check(
    "la admin lee el horario de Sebastián",
    originalResp.status === 200 && original.doctorId === SEBASTIAN,
    `status=${originalResp.status} doctor=${original.doctorId}`,
  );
  check(
    "el horario cargado tiene franjas",
    (original.rules ?? []).length > 0,
    `${(original.rules ?? []).length} franjas`,
  );

  check("Sebastián lee el suyo", (await get(doc, SEBASTIAN)).status === 200, "");
  check(
    "Sebastián NO puede leer el horario de Camila",
    (await get(doc, CAMILA)).status === 403,
    "",
  );

  const invertida = await post(doc, {
    doctorId: SEBASTIAN,
    rules: [regla(1, "19:00", "09:00")],
  });
  check("una franja invertida da 422", invertida.status === 422, `status=${invertida.status}`);
  check(
    "y explica el motivo",
    invertida.text.includes("posterior al inicio"),
    invertida.text.slice(0, 90),
  );

  const solape = await post(doc, {
    doctorId: SEBASTIAN,
    rules: [regla(1, "09:00", "13:00"), regla(1, "12:00", "15:00")],
  });
  check("franjas solapadas dan 422", solape.status === 422, `status=${solape.status}`);
  check(
    "y habla de solape",
    solape.text.includes("solaparse"),
    solape.text.slice(0, 90),
  );

  check(
    "weekday fuera de 0..6 da 422",
    (await post(doc, { doctorId: SEBASTIAN, rules: [regla(9, "09:00", "13:00")] })).status === 422,
    "",
  );
  check(
    "hora sin cero a la izquierda da 422",
    (await post(doc, { doctorId: SEBASTIAN, rules: [regla(1, "9:00", "13:00")] })).status === 422,
    "",
  );
  check(
    "sin sesión no se puede guardar (401)",
    (await post(anon, { doctorId: SEBASTIAN, rules: [] })).status === 401,
    "",
  );
  const ajeno = await post(doc, { doctorId: CAMILA, rules: [] });
  check(
    "Sebastián NO puede guardar el horario de Camila (403)",
    ajeno.status === 403,
    `status=${ajeno.status} ${ajeno.text.slice(0, 70)}`,
  );

  /*
   * El caso que justifica la confirmación: guardar un horario que deja
   * fuera una cita ya agendada. El cambio no la cancela ni la mueve, así
   * que hay que avisar ANTES. Se reserva una cita real, se vacía el
   * horario, y se exige que la API diga "hay conflicto" antes de aplicar.
   */
  const slot = hoy.slots.find((s) => s.doctor_id === SEBASTIAN);
  check(
    "hay una hora libre de Sebastián para probarlo",
    Boolean(slot),
    slot?.slot_start ?? "ninguna",
  );

  if (slot && (original.rules ?? []).length > 0) {
    let cita = null;

    try {
      const email = `horario.${Date.now()}@test.cl`;
      const reservada = await req(null, "/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: SERVICE,
          doctorId: slot.doctor_id,
          slotStart: slot.slot_start,
          fullName: "Paciente Horario",
          rut: RUT_UNICO,
          phone: "+56900000009",
          email,
          consent: true,
        }),
      });
      check(
        "cita creada para probar el 409",
        reservada.status === 201,
        `status=${reservada.status} ${reservada.text.slice(0, 80)}`,
      );
      cita = reservada.status === 201 ? JSON.parse(reservada.text) : null;

      // Vaciar el horario: TODO queda fuera de rango.
      const vacio = await post(admin, { doctorId: SEBASTIAN, rules: [] });
      check(
        "guardar un horario que deja fuera citas da 409",
        vacio.status === 409,
        `status=${vacio.status} ${vacio.text.slice(0, 90)}`,
      );
      check(
        "el 409 lista los conflictos con día y hora",
        Array.isArray(json(vacio).conflicts) &&
          json(vacio).conflicts.length >= 1 &&
          Boolean(json(vacio).conflicts[0].dia) &&
          Boolean(json(vacio).conflicts[0].hora),
        JSON.stringify(json(vacio).conflicts ?? []).slice(0, 110),
      );

      const tras409 = json(await get(admin, SEBASTIAN));
      check(
        "el 409 NO ha tocado el horario",
        (tras409.rules ?? []).length === original.rules.length,
        `${(tras409.rules ?? []).length} vs ${(original.rules ?? []).length}`,
      );


      const confirmado = await post(admin, {
        doctorId: SEBASTIAN,
        rules: [],
        confirm: true,
      });
      check(
        "confirmado, guarda y avisa cuántas citas quedan fuera",
        confirmado.status === 200 && (json(confirmado).warnings ?? 0) >= 1,
        `status=${confirmado.status} warnings=${json(confirmado).warnings}`,
      );
      const sinHorario = await (
        await fetch(
          `${BASE}/api/slots?date=${slotDate}&serviceId=${SERVICE}&doctorId=${SEBASTIAN}`,
        )
      ).json();
      check(
        "con el horario vacío el asistente no ofrece horas",
        (sinHorario.slots ?? []).length === 0,
        `${(sinHorario.slots ?? []).length} slots`,
      );
    } finally {
      /*
       * El restaurar va en `finally` a propósito. Si un chequeo de arriba
       * lanza (o la red falla), el horario de Sebastián quedaría VACÍO y el
       * siguiente checker vería un profesional sin horas: el test deja la
       * base peor que como la encontró. Esto le pasó ya una vez.
       */
      const restaurada = await post(admin, {
        doctorId: SEBASTIAN,
        rules: comoReglas(original.rules),
      });
      check(
        "siempre se restaura el horario original",
        restaurada.status === 200 &&
          (json(restaurada).rules ?? []).length === (original.rules ?? []).length,
        `status=${restaurada.status} ${(json(restaurada).rules ?? []).length} franjas`,
      );

      const conHorario = await (
        await fetch(
          `${BASE}/api/slots?date=${slotDate}&serviceId=${SERVICE}&doctorId=${SEBASTIAN}`,
        )
      ).json();
      check(
        "restaurado, el asistente vuelve a ofrecer horas",
        (conHorario.slots ?? []).length > 0,
        `${(conHorario.slots ?? []).length} slots`,
      );

      if (cita) {
        const limpieza = await req(admin, "/api/dashboard/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId: cita.appointmentId,
            action: "cancelled",
            reason: "limpieza de panel-check",
          }),
        });
        console.log(
          `  (cita ${String(cita.appointmentId).slice(0, 8)} cancelada para limpiar: ${limpieza.status})`,
        );
      }
    }
  } else {
    console.log("  (se omite la prueba del 409: no hay horario que vaciar)");
  }
}
console.log("\n[8] Bloqueos de tiempo");
{
  const json = (r) => {
    try {
      return JSON.parse(r.text);
    } catch {
      return {};
    }
  };
  const get = (cookies, doctorId) =>
    req(cookies, `/api/dashboard/time-off${doctorId ? `?doctorId=${doctorId}` : ""}`);
  const post = (cookies, body) =>
    req(cookies, "/api/dashboard/time-off", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const del = (cookies, body) =>
    req(cookies, "/api/dashboard/time-off", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const slotsPublicos = async (doctorId) => {
    const r = await fetch(
      `${BASE}/api/slots?date=2026-11-10&serviceId=${SERVICE}&doctorId=${doctorId}`,
    );
    return ((await r.json()).slots ?? []).length;
  };

  const anon = jar();
  const sinSesion = await req(anon, "/dashboard/bloqueos");
  check(
    "sin sesión, /dashboard/bloqueos redirige al login",
    sinSesion.status >= 300 && sinSesion.status < 400,
    `status=${sinSesion.status}`,
  );

  // Sin importar qué pasó en una corrida anterior: se parte sin bloqueos.
  for (const doctorId of [SEBASTIAN, CAMILA]) {
    const previos = json(await get(admin, doctorId)).blocks ?? [];
    for (const b of previos) await del(admin, { id: b.id });
    if (previos.length > 0) {
      console.log(`  (limpieza inicial: ${previos.length} bloqueos residuales eliminados)`);
    }
  }

  const pagina = await req(admin, "/dashboard/bloqueos");
  check("la admin abre /dashboard/bloqueos", pagina.status === 200, `status=${pagina.status}`);
  check("la página se titula Bloqueos de tiempo", pagina.text.includes("Bloqueos de tiempo"));
  check(
    "la admin puede elegir a qué profesional",
    pagina.text.includes('id="filtro-doctor"'),
  );

  const paginaProfe = await req(doc, "/dashboard/bloqueos");
  check(
    "el profesional abre su sección de bloqueos",
    paginaProfe.status === 200,
    `status=${paginaProfe.status}`,
  );
  check(
    "un profesional NO ve el selector de equipo",
    !paginaProfe.text.includes('id="filtro-doctor"'),
  );

  check("GET sin sesión da 401", (await get(anon)).status === 401, "");
  const leidos = await get(admin, SEBASTIAN);
  check(
    "la admin lee los bloqueos de Sebastián",
    leidos.status === 200 &&
      json(leidos).doctorId === SEBASTIAN &&
      Array.isArray(json(leidos).blocks),
    `status=${leidos.status}`,
  );
  check("Sebastián lee los suyos", (await get(doc, SEBASTIAN)).status === 200, "");
  check(
    "Sebastián NO puede leer los de Camila",
    (await get(doc, CAMILA)).status === 403,
    "",
  );

  const invalido = await post(admin, {
    doctorId: SEBASTIAN,
    startsAt: "no-iso",
    endsAt: "tampoco",
  });
  check("un bloqueo inválido da 422", invalido.status === 422, `status=${invalido.status}`);

  // 2026-11-06 08:00–10:00 en Santiago = 11:00:00Z–13:00:00Z (UTC-3 en noviembre).
  const creado = await post(doc, {
    doctorId: SEBASTIAN,
    startsAt: "2026-11-06T11:00:00.000Z",
    endsAt: "2026-11-06T13:00:00.000Z",
    reason: "panel-check",
  });
  const creadoJson = json(creado);
  check(
    "el profesional crea su bloqueo",
    creado.status === 201 && creadoJson.ok === true,
    `status=${creado.status}`,
  );
  check(
    "empieza a las 08:00 de Santiago (11:00 UTC)",
    typeof creadoJson.block?.startsAt === "string" &&
      creadoJson.block.startsAt.startsWith("2026-11-06T11:00"),
    String(creadoJson.block?.startsAt ?? creadoJson.error),
  );
  check(
    "sin citas dentro, no avisa",
    creadoJson.warnings === 0,
    `warnings=${creadoJson.warnings}`,
  );

  const trasCrear = json(await get(doc, SEBASTIAN));
  check(
    "su lista ahora tiene 1 bloqueo",
    (trasCrear.blocks ?? []).length === 1,
    `${(trasCrear.blocks ?? []).length}`,
  );

  const ajeno = await post(doc, {
    doctorId: CAMILA,
    startsAt: "2026-11-06T11:00:00.000Z",
    endsAt: "2026-11-06T13:00:00.000Z",
  });
  check(
    "un profesional NO puede bloquear a otro",
    ajeno.status === 403,
    `status=${ajeno.status}`,
  );

  const antes = await slotsPublicos(CAMILA);
  check("el día de la cita de prueba tiene horas disponibles", antes > 0, `${antes} slots`);

  // Cita de prueba real para poder probar el 409 sin depender de datos viejos.
  const slotDisponible = async () => {
    const r = await fetch(
      `${BASE}/api/slots?date=2026-11-10&serviceId=${SERVICE}&doctorId=${CAMILA}`,
    );
    return ((await r.json()).slots ?? [])[0]?.slot_start;
  };
  let citaPrueba = null;
  try {
    const slotStart = await slotDisponible();
    check(
      "hay un slot libre para la cita de prueba",
      typeof slotStart === "string",
      String(slotStart ?? ""),
    );
    const reserva = await req(null, "/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: SERVICE,
        doctorId: CAMILA,
        slotStart,
        fullName: "Paciente Bloqueo",
        rut: RUT_UNICO,
        phone: "+56900000002",
        email: `panel.${Date.now()}@test.cl`,
        consent: true,
      }),
    });
    citaPrueba = JSON.parse(reserva.text);
    check(
      "cita creada para probar el 409 del bloqueo",
      reserva.status === 201,
      `status=${reserva.status}`,
    );
    const trasCita = await slotsPublicos(CAMILA);

    // Día completo del 2026-11-10 para Camila: la cita recién creada queda dentro.
    const diaEntero = await post(admin, {
      doctorId: CAMILA,
      startsAt: "2026-11-10T00:00:00.000Z",
      endsAt: "2026-11-11T00:00:00.000Z",
      confirm: false,
    });
    const diaEnteroJson = json(diaEntero);
    check(
      "bloquear un día con cita agendada da 409",
      diaEntero.status === 409 &&
        diaEnteroJson.code === "bloqueo_con_citas" &&
        (diaEnteroJson.conflicts ?? []).length >= 1,
      `status=${diaEntero.status} ${diaEnteroJson.conflicts?.length ?? 0} cita(s)`,
    );
    check(
      "el conflicto apunta al día correcto",
      diaEnteroJson.conflicts?.[0]?.dia === "2026-11-10",
      String(diaEnteroJson.conflicts?.[0]?.dia),
    );

    const forzado = await post(admin, {
      doctorId: CAMILA,
      startsAt: "2026-11-10T00:00:00.000Z",
      endsAt: "2026-11-11T00:00:00.000Z",
      confirm: true,
    });
    const forzadoJson = json(forzado);
    check(
      "con confirmación se bloquea igual",
      forzado.status === 201 && forzadoJson.ok === true && forzadoJson.warnings >= 1,
      `status=${forzado.status} warnings=${forzadoJson.warnings}`,
    );

    const medio = await slotsPublicos(CAMILA);
    check(
      "bloqueado el día completo, el público ya no ofrece horas",
      medio === 0,
      `${medio} slots`,
    );

    const camilaBloques = json(await get(admin, CAMILA)).blocks ?? [];
    check("el de Camila está en su lista", camilaBloques.length === 1, `${camilaBloques.length}`);

    const borrarCamila = await del(admin, { id: camilaBloques[0]?.id ?? "nada" });
    check(
      "una admin elimina un bloqueo",
      borrarCamila.status === 200 && json(borrarCamila).ok === true,
      `status=${borrarCamila.status}`,
    );

    const despues = await slotsPublicos(CAMILA);
    check("al borrar, las horas vuelven al público", despues === trasCita, `${despues} slots`);
  } finally {
    // Sin importar qué pasó: se borran los bloqueos de Camila y la cita de prueba.
    const sobrantes = json(await get(admin, CAMILA)).blocks ?? [];
    for (const b of sobrantes) await del(admin, { id: b.id });
    if (citaPrueba?.appointmentId) {
      const limpieza = await req(admin, "/api/dashboard/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: citaPrueba.appointmentId,
          action: "cancelled",
          reason: "limpieza de panel-check",
        }),
      });
      console.log(
        `  (cita ${String(citaPrueba.appointmentId).slice(0, 8)} cancelada para limpiar: ${limpieza.status})`,
      );
    }
  }

  const miBloque = json(await get(admin, SEBASTIAN)).blocks ?? [];
  check("el de Sebastián está en la suya", miBloque.length === 1, `${miBloque.length}`);

  const borrarSebas = await del(doc, { id: miBloque[0]?.id ?? "nada" });
  check(
    "el dueño elimina su bloqueo",
    borrarSebas.status === 200 && json(borrarSebas).ok === true,
    `status=${borrarSebas.status}`,
  );

  const inexistente = await del(doc, { id: "00000000-0000-0000-0000-000000000000" });
  check("borrar un bloqueo inexistente da 404", inexistente.status === 404, `status=${inexistente.status}`);
  const sinId = await del(doc, {});
  check("borrar sin id da 422", sinId.status === 422, `status=${sinId.status}`);

  const trasLimpiar = json(await get(admin, CAMILA)).blocks ?? [];
  check("quedó todo limpio", trasLimpiar.length === 0, `${trasLimpiar.length} bloqueos`);
}

console.log("\n[9] Feriados");
{
  const json = (r) => {
    try {
      return JSON.parse(r.text);
    } catch {
      return {};
    }
  };
  const get = (cookies) => req(cookies, "/api/dashboard/holidays");
  const post = (cookies, body) =>
    req(cookies, "/api/dashboard/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const del = (cookies, body) =>
    req(cookies, "/api/dashboard/holidays", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const slotsPublicos = async () => {
    const r = await fetch(
      `${BASE}/api/slots?date=2026-11-06&serviceId=${SERVICE}&doctorId=${CAMILA}`,
    );
    return ((await r.json()).slots ?? []).length;
  };

  const anon = jar();
  const sinSesion = await req(anon, "/dashboard/feriados");
  check(
    "sin sesión, /dashboard/feriados redirige al login",
    sinSesion.status >= 300 && sinSesion.status < 400,
    `status=${sinSesion.status}`,
  );

  const pagina = await req(admin, "/dashboard/feriados");
  check("la admin abre /dashboard/feriados", pagina.status === 200, `status=${pagina.status}`);
  check("la página se titula Feriados", pagina.text.includes("Feriados"));
  check("tiene el formulario para agregar", pagina.text.includes("Agregar feriado"));

  const paginaProfe = await req(doc, "/dashboard/feriados");
  check(
    "un profesional NO abre la página (redirige)",
    paginaProfe.status >= 300 && paginaProfe.status < 400,
    `status=${paginaProfe.status} location=${paginaProfe.location ?? ""}`,
  );

  check("GET sin sesión da 401", (await get(anon)).status === 401, "");
  const baseRes = await get(admin);
  const base = json(baseRes);
  check(
    "la admin lee la lista de feriados",
    baseRes.status === 200 && Array.isArray(base.holidays),
    `${(base.holidays ?? []).length} feriados`,
  );

  check(
    "un profesional NO puede crear feriados",
    (await post(doc, { date: "2026-11-06", name: "Prueba" })).status === 403,
    "",
  );
  check(
    "un profesional NO puede eliminar feriados",
    (await del(doc, { date: "2026-11-06" })).status === 403,
    "",
  );
  const invalido = await post(admin, { date: "11-06", name: "X" });
  check("un feriado mal escrito da 422", invalido.status === 422, `status=${invalido.status}`);

  const antes = await slotsPublicos();
  check("el día elegido tiene horas disponibles", antes > 0, `${antes} slots`);

  const creado = await post(admin, { date: "2026-11-06", name: "Feriado de prueba" });
  const creadoJson = json(creado);
  check(
    "la admin crea un feriado",
    creado.status === 201 && creadoJson.ok === true && creadoJson.holiday?.date === "2026-11-06",
    `status=${creado.status}`,
  );
  const duplicado = await post(admin, { date: "2026-11-06", name: "Segundo intento" });
  const duplicadoJson = json(duplicado);
  check(
    "un feriado repetido da 409",
    duplicado.status === 409 && duplicadoJson.code === "feriado_duplicado",
    `status=${duplicado.status}`,
  );

  const durante = await slotsPublicos();
  check("con feriado, el público no ofrece horas ese día", durante === 0, `${durante} slots`);

  const lista = json(await get(admin));
  check(
    "el feriado aparece en la lista",
    (lista.holidays ?? []).some((h) => h.date === "2026-11-06" && h.name === "Feriado de prueba"),
    `${(lista.holidays ?? []).length} feriados`,
  );

  const borrado = await del(admin, { date: "2026-11-06" });
  check(
    "la admin lo elimina",
    borrado.status === 200 && json(borrado).ok === true,
    `status=${borrado.status}`,
  );
  const inexistente = await del(admin, { date: "2030-01-02" });
  check("eliminar un día que no es feriado da 404", inexistente.status === 404, `status=${inexistente.status}`);

  const despues = await slotsPublicos();
  check("al eliminarlo, las horas vuelven al público", despues === antes, `${despues} slots`);

  const listaFinal = json(await get(admin));
  check(
    "quedó todo limpio",
    !(listaFinal.holidays ?? []).some((h) => h.date === "2026-11-06"),
    `${(listaFinal.holidays ?? []).length} feriados`,
  );
}

console.log("\n[10] Organizaciones");
const plataforma = jar();
{
  const json = (r) => {
    try {
      return JSON.parse(r.text);
    } catch {
      return {};
    }
  };
  const borrar = (cookies, body) =>
    req(cookies, "/api/platform/organizations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const login = await req(plataforma, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@agenda.test", password: "AgendaDev2026!" }),
  });
  check("entra el equipo de plataforma", login.status === 200, `status=${login.status}`);

  const listado = await req(plataforma, "/dashboard/plataforma/organizaciones");
  check("abre el listado de organizaciones", listado.status === 200, `status=${listado.status}`);
  check("lista las clínicas existentes", listado.text.includes(">sonrisa-dental"));

  const sinPermiso = await req(admin, "/dashboard/plataforma/organizaciones");
  check(
    "una administradora de clínica no llega al panel de plataforma",
    sinPermiso.status >= 300 && sinPermiso.status < 400,
    `status=${sinPermiso.status}`,
  );

  const anonimo = await req(null, "/api/platform/organizations", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: "clinica-feliz" }),
  });
  check("sin sesión no borra nada", anonimo.status === 401, `status=${anonimo.status}`);

  const sinSlug = await borrar(plataforma, {});
  check("sin identificador responde 422", sinSlug.status === 422, `status=${sinSlug.status}`);

  const inexistente = await borrar(plataforma, { slug: "no-existe-esta-clinica" });
  check("una clínica inexistente responde 404", inexistente.status === 404, `status=${inexistente.status}`);

  const ajena = await borrar(admin, { slug: "clinica-feliz" });
  check("una administradora de clínica no puede borrar", ajena.status === 403, `status=${ajena.status}`);

  const propia = await borrar(plataforma, { slug: "plataforma" });
  check(
    "la plataforma no se borra a sí misma",
    propia.status === 409 && json(propia).code === "organizacion_propia",
    `status=${propia.status} code=${json(propia).code}`,
  );

  const conCitas = await borrar(plataforma, { slug: "sonrisa-dental" });
  check(
    "una clínica con citas no se borra",
    conCitas.status === 409 && json(conCitas).code === "tiene_citas",
    `status=${conCitas.status} code=${json(conCitas).code}`,
  );

  const slugDePrueba = `borrable-${Date.now()}`;
  const creada = await req(plataforma, "/api/platform/organizations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Clínica Borrable",
      slug: slugDePrueba,
      adminFullName: "Prueba Borrable",
      adminEmail: `${slugDePrueba}@test.cl`,
      adminPassword: "AgendaDev2026!",
    }),
  });
  check(
    "se crea una clínica de prueba",
    creada.status === 201,
    `status=${creada.status} ${json(creada).error ?? ""}`,
  );

  const borrada = await borrar(plataforma, { slug: slugDePrueba });
  check(
    "se elimina completa",
    borrada.status === 200 && json(borrada).ok === true,
    `status=${borrada.status} ${json(borrada).error ?? ""}`,
  );

  const otraVez = await borrar(plataforma, { slug: slugDePrueba });
  check("al volver a borrarla responde 404", otraVez.status === 404, `status=${otraVez.status}`);

  const trasBorrar = await req(null, `/${slugDePrueba}`);
  check("su página pública deja de existir", trasBorrar.status === 404, `status=${trasBorrar.status}`);
}

console.log("\n[11] Ficha clínica");
let FICHA_PATIENT = null;
{
  const json = (r) => {
    try {
      return JSON.parse(r.text);
    } catch {
      return {};
    }
  };

  // -- Acceso del admin de la clínica --
  const lista = await req(admin, "/api/ficha/patients");
  check(
    "la admin lista los pacientes",
    lista.status === 200 && Array.isArray(json(lista).patients),
    `status=${lista.status}`,
  );
  const mauricio = (json(lista).patients ?? []).find((p) => p.full_name?.includes("Mauricio"));
  check("aparece el paciente demo 'Mauricio'", Boolean(mauricio?.id), mauricio?.full_name);
  if (mauricio?.id) FICHA_PATIENT = mauricio.id;

  // -- Detalle con antecedentes --
  const detalle = await req(admin, `/api/ficha/patients/${FICHA_PATIENT}`);
  check("el detalle incluye la ficha completa", detalle.status === 200, `status=${detalle.status}`);
  // PostgREST embebe la relación 1:1 de antecedentes como OBJETO (no array).
  const bg = json(detalle).patient?.patient_medical_background;
  const bgArr = Array.isArray(bg) ? bg : bg ? [bg] : [];
  check(
    "los antecedentes vienen anidados",
    bgArr.length === 1 && (bgArr[0]?.alergias ?? []).includes("penicilina"),
    bgArr.length === 0 ? "sin fila" : `alergias=${(bgArr[0]?.alergias ?? []).join(",")}`,
  );

  // -- Aislamiento: recibirlo y profesionales de otra organización no ven su ficha --
  const recepcion = jar();
  await req(recepcion, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "recepcion@clinicadental.test", password: "AgendaDev2026!" }),
  });
  const recLista = await req(recepcion, "/api/ficha/patients");
  check("la recepción lista pacientes por contacto", recLista.status === 200 && Array.isArray(json(recLista).patients),
    `status=${recLista.status}`);
  const recDetalle = await req(recepcion, `/api/ficha/patients/${FICHA_PATIENT}`);
  check("la recepción NO ve el detalle clínico", recDetalle.status === 403, `status=${recDetalle.status}`);

  const psicologa = jar();
  await req(psicologa, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "valentina.soto@espaciocalma.test", password: "AgendaDev2026!" }),
  });
  const ajena = await req(psicologa, `/api/ficha/patients/${FICHA_PATIENT}`);
  check("un profesional de otra clínica obtiene 404", ajena.status === 404, `status=${ajena.status}`);

  // -- Atenciones: crear borrador, editar y firmar --
  const creada = await req(admin, `/api/ficha/patients/${FICHA_PATIENT}/encounters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      patient_id: FICHA_PATIENT,
      started_at: "2026-10-06",
      care_type: "control",
      motivo: "Control post-tratamiento",
      evolucion: "Buenas condiciones, sin dolor",
      diagnostico: "Sin hallazgos",
      indicaciones: "Seguir indicaciones",
    }),
  });
  check("se crea una atención en borrador", creada.status === 201, `status=${creada.status}`);
  const encId = json(creada).encounter?.id;
  check("la atención tiene id", Boolean(encId), encId);

  const editada = await req(admin, `/api/ficha/encounters/${encId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ care_type: "control", motivo: "Control post-tratamiento (editado)", evolucion: "Buenas condiciones" }),
  });
  check("el borrador se puede editar", editada.status === 200, `status=${editada.status}`);

  const firmada = await req(admin, `/api/ficha/encounters/${encId}`, { method: "POST" });
  check("la atención se firma", firmada.status === 200 && json(firmada).encounter?.status === "signed",
    `status=${firmada.status}`);
  check("la firma deja author y fecha", Boolean(json(firmada).encounter?.signed_by && json(firmada).encounter?.signed_at),
    "");

  // -- Inmutabilidad tras firmar --
  const reedited = await req(admin, `/api/ficha/encounters/${encId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ motivo: "No debería entrar" }),
  });
  // La firma es inmutable: la ruta rechaza el borrador firmado (404 al no
  // encontrar blanco de edición) y la base además lo bloquea (EFIRM = 409
  // ficha_firmada). Cualquiera de los dos respeta la garantía.
  check(
    "editar una atención firmada está bloqueado",
    reedited.status === 404 || (reedited.status === 409 && json(reedited).code === "ficha_firmada"),
    `status=${reedited.status} code=${json(reedited).code}`,
  );

  const versiones = await req(admin, `/api/ficha/encounters/${encId}/versions`);
  check(
    "la firma generó un snapshot de versión",
    versiones.status === 200 && (json(versiones).versions ?? []).length >= 1,
    `status=${versiones.status} n=${(json(versiones).versions ?? []).length}`,
  );

  const correccion = await req(admin, `/api/ficha/encounters/${encId}/versions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "Se agrega observación post-control" }),
  });
  check("se registra una corrección en el historial", correccion.status === 201, `status=${correccion.status}`);

  // -- Odontograma y plan (sólo odontológico) --
  const chart = await req(admin, `/api/ficha/patients/${FICHA_PATIENT}/chart`);
  const pieza16 = (json(chart).chart ?? []).find((e) => e.tooth === 16 && e.face === "occlusal");
  check("el odontograma muestra caries en pieza 16", chart.status === 200 && pieza16?.state === "caries",
    `${pieza16?.tooth} ${pieza16?.face}=${pieza16?.state}`);

  const plan = await req(admin, `/api/ficha/patients/${FICHA_PATIENT}/plan`);
  check("el plan tiene los tratamientos sembrados", plan.status === 200 && (json(plan).items ?? []).length >= 2,
    `status=${plan.status} n=${(json(plan).items ?? []).length}`);

  const recetas = await req(admin, `/api/ficha/patients/${FICHA_PATIENT}/prescriptions`);
  check("la receta sembrada aparece", recetas.status === 200 && (json(recetas).prescriptions ?? []).length >= 1,
    `status=${recetas.status}`);

  // -- Exportar y PDF --
  const expJson = await req(admin, `/api/ficha/patients/${FICHA_PATIENT}/export`);
  check("la exportación JSON responde", expJson.status === 200 && Boolean(json(expJson).patient?.id),
    `status=${expJson.status}`);
  const expCsv = await req(admin, `/api/ficha/patients/${FICHA_PATIENT}/export?format=csv`);
  check("la exportación CSV responde", expCsv.status === 200 && expCsv.text.includes("Mauricio"),
    `status=${expCsv.status}`);
  const pdf = await req(admin, `/api/ficha/patients/${FICHA_PATIENT}/pdf`);
  check("el PDF de la ficha se genera", pdf.status === 200 && pdf.text.startsWith("%PDF"),
    `status=${pdf.status} head=${pdf.text.slice(0, 20)}`);

  // -- Auditoría registra la firma sobre la entidad que la recibió --
  const auditPaciente = await req(admin, `/api/ficha/audit?entity_id=${FICHA_PATIENT}&limit=200`);
  check(
    "la auditoría tiene entradas del paciente",
    auditPaciente.status === 200 && (json(auditPaciente).entries ?? []).length >= 1,
    `status=${auditPaciente.status} n=${(json(auditPaciente).entries ?? []).length}`,
  );
  const auditEnc = await req(admin, `/api/ficha/audit?entity=encounters&entity_id=${encId}&limit=50`);
  const accionesEnc = (json(auditEnc).entries ?? []).map((e) => e.action);
  check(
    "la auditoría registra la firma de la atención",
    auditEnc.status === 200 && accionesEnc.includes("sign"),
    `status=${auditEnc.status} acciones=${[...new Set(accionesEnc)].join(",")}`,
  );

  // -- La recepción no toca nada clínico --
  const recReceta = await req(recepcion, `/api/ficha/patients/${FICHA_PATIENT}/prescriptions`);
  check("la recepción no lee recetas", recReceta.status === 403, `status=${recReceta.status}`);

  // -- Propiedad: cada médico registra/edita los suyos; el resto solo ve --
  const RUT_DUENO = rutUnico();
  let nuevoPaciente = null;
  let pacienteDeCamila = null;
  try {
    const nuevo = await req(doc, "/api/ficha/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: "Ana Propiedad",
        rut: RUT_DUENO,
        phone: "+56900000002",
        email: `dueno.${Date.now()}@test.cl`,
        sex: "female",
      }),
    });
    check("un médico registra su propio paciente", nuevo.status === 201, `status=${nuevo.status}`);
    nuevoPaciente = json(nuevo).patient?.id ?? null;
    check(
      "y queda asignado a él como dueño",
      json(nuevo).patient?.doctor_id === SEBASTIAN,
      `doctor_id=${json(nuevo).patient?.doctor_id}`,
    );

    const adminEdit = await req(admin, `/api/ficha/patients/${nuevoPaciente}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+56911112222" }),
    });
    check("el administrador puede editar pacientes de otros", adminEdit.status === 200, `status=${adminEdit.status}`);
    check(
      "y conserva el dueño original",
      json(adminEdit).patient?.doctor_id === SEBASTIAN,
      `doctor_id=${json(adminEdit).patient?.doctor_id}`,
    );

    const propio = await req(admin, "/api/ficha/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: "Bernarda De Camila",
        rut: rutUnico(),
        email: `cmila.${Date.now()}@test.cl`,
      }),
    });
    pacienteDeCamila = json(propio).patient?.id ?? null;
    check("el administrador registra un paciente suyo", propio.status === 201, `status=${propio.status}`);

    const cruceEdit = await req(doc, `/api/ficha/patients/${pacienteDeCamila}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+56955554444" }),
    });
    check(
      "un médico NO edita el paciente de otro",
      cruceEdit.status === 403 || cruceEdit.status === 404,
      `status=${cruceEdit.status}`,
    );

    const cruceDel = await req(doc, `/api/ficha/patients/${pacienteDeCamila}`, { method: "DELETE" });
    check("tampoco lo borra", cruceDel.status === 403 || cruceDel.status === 404, `status=${cruceDel.status}`);

    const recPost = await req(recepcion, "/api/ficha/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: "Nadie", email: `nadie.${Date.now()}@test.cl` }),
    });
    check("la recepción no registra pacientes", recPost.status === 403, `status=${recPost.status}`);

    const borrado = await req(admin, `/api/ficha/patients/${nuevoPaciente}`, { method: "DELETE" });
    check("el dueño/admin puede borrar el paciente de prueba", borrado.status === 200, `status=${borrado.status}`);
    nuevoPaciente = null;

    // Un paciente que tiene (o tuvo) citas nunca se borra: el registro de
    // agenda permanece, aunque la cita esté cancelada o completada.
    const listaPanel = await req(admin, `/api/ficha/patients?q=${encodeURIComponent("Paciente Panel")}&limit=20`);
    const conCita = (JSON.parse(listaPanel.text).patients ?? [])[0];
    const delConCita = conCita
      ? await req(admin, `/api/ficha/patients/${conCita.id}`, { method: "DELETE" })
      : null;
    check(
      "no se puede borrar un paciente con citas",
      delConCita?.status === 409 && json(delConCita).code === "tiene_citas",
      delConCita ? `status=${delConCita.status} code=${json(delConCita).code}` : "sin paciente con citas",
    );

    const recDel = await req(recepcion, `/api/ficha/patients/${FICHA_PATIENT}`, { method: "DELETE" });
    check("la recepción no borra pacientes", recDel.status === 403, `status=${recDel.status}`);
  } finally {
    const limpiar = async (id, nombre) => {
      if (!id) return;
      const r = await req(admin, `/api/ficha/patients/${id}`, { method: "DELETE" });
      console.log(`  (paciente ${nombre} ${id.slice(0, 8)} borrado para limpiar: ${r.status})`);
    };
    await limpiar(nuevoPaciente, "Ana");
    await limpiar(pacienteDeCamila, "Bernarda");
  }

  // -- Limpieza del borrador/firma creados en esta prueba --
  // No hay endpoint de borrado (inmutabilidad), así que este check es
  // informativo: la fila permanece como parte del demo.
}

console.log("\n[12] Listado de pacientes: tabla, orden y paginación");
{
  const json = (r) => {
    try {
      return JSON.parse(r.text);
    } catch {
      return {};
    }
  };
  // React inserta <!-- --> entre nodos de texto en el SSR; se quitan para
  // poder leer el HTML con regex simples.
  const limpio = (html) => html.replace(/<!-- -->/g, "");
  const primerNombre = (html) =>
    (limpio(html).match(/\/dashboard\/pacientes\/[0-9a-f-]{36}"[^>]*>([^<]+)<\/a>/) ?? [])[1] ?? "";
  const contador = (html) => {
    const m = limpio(html).match(/patients-count">(\d+) pacient/);
    return m ? Number(m[1]) : null;
  };

  const creados = [];
  try {
    const sello = Date.now();
    for (let i = 1; i <= 26; i++) {
      const r = await req(admin, "/api/ficha/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: `Paginacion ${String(i).padStart(2, "0")}`,
          email: `pag.${i}.${sello}@test.cl`,
        }),
      });
      const id = json(r).patient?.id;
      if (id) creados.push(id);
    }
    check("se crean 26 pacientes para forzar dos páginas", creados.length === 26, `creados=${creados.length}`);

    const zoila = await req(admin, "/api/ficha/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: "Zoila Receptacion Especial", email: `zoila.${sello}@test.cl` }),
    });
    const zoilaId = json(zoila).patient?.id;
    if (zoilaId) creados.push(zoilaId);
    check("se crea el paciente único del buscador", Boolean(zoilaId));

    // -- Estructura de la tabla --
    const primera = await req(admin, "/dashboard/pacientes");
    const html1 = limpio(primera.text);
    const nombre1 = primerNombre(primera.text);
    check(
      "el listado renderiza la tabla con sus columnas",
      primera.status === 200 &&
        html1.includes('data-testid="patients-table"') &&
        html1.includes("aria-sort") &&
        [">Paciente<", ">RUT<", ">Contacto<", ">Nacimiento<", ">Estado<"].every((h) => html1.includes(h)),
      `status=${primera.status} primer=${nombre1}`,
    );
    check("los encabezados permiten ordenar por RUT", html1.includes("/dashboard/pacientes?sort=rut"));

    // -- Paginación --
    const pag1 = html1.match(/Página (\d+) de (\d+)/);
    check(
      "la tabla pagina cuando hay más de 25 pacientes",
      html1.includes('data-testid="patients-pagination"') && Number(pag1?.[2]) >= 2,
      pag1?.[0] ?? "sin paginación",
    );

    const segunda = await req(admin, "/dashboard/pacientes?page=2");
    const html2 = limpio(segunda.text);
    const nombre2 = primerNombre(segunda.text);
    check(
      "la página 2 muestra otros pacientes",
      segunda.status === 200 &&
        html2.includes('data-testid="patients-table"') &&
        /Página 2 de \d+/.test(html2) &&
        html2.includes("‹ Anterior") &&
        Boolean(nombre2) &&
        nombre2 !== nombre1,
      `status=${segunda.status} p1=${nombre1} p2=${nombre2}`,
    );

    // -- Orden por columna --
    const desc = await req(admin, "/dashboard/pacientes?sort=full_name&dir=desc");
    const nombreDesc = primerNombre(desc.text);
    check(
      "ordenar por nombre invierte el listado",
      desc.status === 200 && Boolean(nombreDesc) && nombreDesc !== nombre1,
      `asc=${nombre1} desc=${nombreDesc}`,
    );

    // -- Buscador --
    const buscada = await req(admin, "/dashboard/pacientes?q=Paginacion");
    const nBuscados = contador(buscada.text);
    check(
      "el buscador acota el listado del admin",
      buscada.status === 200 && nBuscados !== null && nBuscados >= 26,
      `count=${nBuscados}`,
    );
    const zoilaAdmin = await req(admin, "/dashboard/pacientes?q=Zoila");
    check("un término único devuelve un solo paciente", contador(zoilaAdmin.text) === 1, `count=${contador(zoilaAdmin.text)}`);

    // -- Recepción: la RPC ahora filtra, ordena y pagina --
    const recep = jar();
    await req(recep, "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "recepcion@clinicadental.test", password: "AgendaDev2026!" }),
    });
    const recPrimera = await req(recep, "/dashboard/pacientes");
    check(
      "la recepción también ve la tabla paginada",
      recPrimera.status === 200 &&
        recPrimera.text.includes('data-testid="patients-table"') &&
        recPrimera.text.includes('data-testid="patients-pagination"'),
      `status=${recPrimera.status}`,
    );
    const recZoila = await req(recep, "/dashboard/pacientes?q=Zoila");
    check(
      "el buscador filtra para la recepción",
      recZoila.status === 200 && contador(recZoila.text) === 1,
      `status=${recZoila.status} count=${contador(recZoila.text)}`,
    );
  } finally {
    for (const id of creados) {
      await req(admin, `/api/ficha/patients/${id}`, { method: "DELETE" });
    }
    console.log(`  (${creados.length} pacientes de prueba de paginación borrados)`);
  }
}

console.log("\n[13] Logout");
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