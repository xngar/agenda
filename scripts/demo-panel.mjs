/**
 * Demostración del panel: reserva una cita desde el sitio público, entra al
 * panel como administrador y comprueba que la cita aparece con su botón
 * "Confirmar". Deja capturas para revisión y limpia lo que creó.
 *
 * Uso: node scripts/demo-panel.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3111";
const OUT = process.argv[2] ?? "C:/Users/xngar/AppData/Local/Temp/opencode/shots";

const ADMIN = { email: "camila.rojas@clinicadental.test", password: "AgendaDev2026!" };
const DOCTOR_LOGIN = {
  email: "sebastian.munoz@clinicadental.test",
  password: "AgendaDev2026!",
};
const DOCTOR = {
  id: "3a335e2c-9881-473a-a98c-94c3661b977e",
  email: "sebastian.munoz@clinicadental.test",
};
const SERVICE = "dccfd3d6-7e66-460b-93ce-989ecbfe270f";

mkdirSync(OUT, { recursive: true });

const sello = Date.now();
const email = `demo.${sello}@test.cl`;
let appointmentId = null;

// ---------------------------------------------------------------- 1. reserva
// La fecha se calcula una vez y se reutiliza: el panel abre por defecto en
// HOY, así que si se reserva a 3 días hay que entrar a la agenda con
// `?date=` o la cita queda en otro día y parece que no aparece.
const dayKey = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);

const slotRes = await fetch(
  `${BASE}/api/slots?date=${dayKey}&serviceId=${SERVICE}&doctorId=${DOCTOR.id}`,
);
const { slots = [] } = await slotRes.json();
if (slots.length === 0) {
  console.error("No hay horas libres para el profesional; no se puede seguir.");
  process.exit(1);
}
const slot = slots[0];

// Ojo: `/api/slots` sólo devuelve `doctor_id` cuando se consulta "cualquiera
// disponible". Al pedir un profesional concreto viene sin él, así que el id
// del profesional se manda aparte.
const reserva = await fetch(`${BASE}/api/bookings`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    serviceId: SERVICE,
    doctorId: DOCTOR.id,
    slotStart: slot.slot_start,
    fullName: "Paciente Demostración",
    rut: "12345678-5",
    phone: "+56911112222",
    email,
    consent: true,
  }),
});
const reservaBody = await reserva.json();
appointmentId = reservaBody.appointmentId ?? null;

console.log(`cita creada: HTTP ${reserva.status} id=${appointmentId ?? "?"} día=${dayKey}`);
if (!reserva.ok) {
  console.error(`  error: ${JSON.stringify(reservaBody)}`);
  process.exit(1);
}

// ---------------------------------------------------------------- 2. panel
const navegador = await chromium.launch();
const ctx = await navegador.newContext({
  locale: "es-CL",
  timezoneId: "America/Santiago",
  viewport: { width: 1280, height: 900 },
});
const page = await ctx.newPage();

const agendaUrl = `${BASE}/dashboard?date=${dayKey}`;
const fallos = [];

/** Entra, abre una URL y comprueba qué se ve. */
async function mirar(credenciales, etiqueta, url, comprobaciones) {
  const login = await page.request.post(`${BASE}/api/auth/login`, { data: credenciales });
  const res = await page.goto(url, { waitUntil: "domcontentloaded" });
  const html = await page.content();
  console.log(`\n${etiqueta} (${credenciales.email})`);
  console.log(`  login=${login.status()} agenda=${res.status()}`);
  for (const [nombre, ok] of Object.entries(comprobaciones(html))) {
    console.log(`  ${nombre.padEnd(28)} ${ok ? "sí" : "NO"}`);
    if (!ok) fallos.push(`${etiqueta}: ${nombre}`);
  }
  return html;
}

const VISTA = (html) => ({
  "ve al paciente": html.includes("Paciente Demostraci"),
  'estado "Por confirmar"': html.includes("Por confirmar"),
  'botón "Confirmar"': html.includes("Confirmar"),
  "ve el teléfono": html.includes("9 1111 2222") || html.includes("911112222"),
});

await mirar(ADMIN, "ADMIN — todo el equipo", agendaUrl, VISTA);
await page.screenshot({ path: `${OUT}/07-panel-agenda.png`, fullPage: true });

// El filtro del admin sobre un profesional concreto.
await mirar(
  ADMIN,
  "ADMIN — filtrado por Sebastián",
  `${agendaUrl}&doctor=${DOCTOR.id}`,
  VISTA,
);
await page.screenshot({ path: `${OUT}/08-panel-agenda-filtrada.png`, fullPage: true });

// La misma cita vista por quien la atenderá.
await mirar(DOCTOR_LOGIN, "DOCTOR — sólo la suya", agendaUrl, VISTA);
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: `${OUT}/09-panel-movil.png`, fullPage: true });
await page.setViewportSize({ width: 1280, height: 900 });

// La gestión de equipo es sólo de admin, así que hay que volver a entrar
// como Camila: la sesión anterior era la del profesional.
await page.request.post(`${BASE}/api/auth/login`, { data: ADMIN });
const equipo = await page.goto(`${BASE}/dashboard/admin`, { waitUntil: "domcontentloaded" });
const htmlEquipo = await equipo.text();
const veEquipo = htmlEquipo.includes("Desactivar");
console.log(`\nADMIN — gestión de equipo (${equipo.status()}): boton "Desactivar" ${veEquipo ? "sí" : "NO"}`);
if (!veEquipo) fallos.push('ADMIN: falta el boton "Desactivar"');
await page.screenshot({ path: `${OUT}/10-panel-admin.png`, fullPage: true });

// ---------------------------------------------------------------- 3. limpieza
// Se cancela desde el contexto del navegador: un `fetch` suelto no lleva la
// cookie de sesión y el servidor la rechazaría.
if (appointmentId) {
  const cleanup = await page.request.post(`${BASE}/api/dashboard/appointments`, {
    data: { appointmentId, action: "cancelled" },
  });
  console.log(`\nlimpieza: cita cancelada (${cleanup.status()})`);
  console.log(`Queda un registro cancelado de la demo: ${appointmentId}`);
}

await navegador.close();
console.log(`\ncapturas en ${OUT}`);
if (fallos.length > 0) {
  console.error(`\n${fallos.length} comprobaciones fallaron:`);
  for (const f of fallos) console.error(`  - ${f}`);
  process.exitCode = 1;
} else {
  console.log("todas las comprobaciones pasaron");
}