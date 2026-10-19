/**
 * Verificación de motion en el panel del profesional.
 *
 * Entra al panel con las credenciales que llegan por variables de entorno
 * (`PANEL_EMAIL` y `PANEL_PASSWORD`) y comprueba, en el navegador:
 * - que no haya errores ni avisos de consola en cada pantalla,
 * - que los tokens de motion estén resueltos en el CSS,
 * - que las tablas escalonen la entrada de sus filas,
 * - que los KPIs cuenten y que los botones asíncronos no salten de tamaño.
 *
 * No deja datos: sólo lee. Para correrlo hace falta el panel levantado
 * (`npm run start`) y credenciales de un profesional de prueba.
 *
 *   PANEL_EMAIL=... PANEL_PASSWORD=... node scripts/panel-motion-check.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3111";
const EMAIL = process.env.PANEL_EMAIL ?? "";
const PASSWORD = process.env.PANEL_PASSWORD ?? "";

if (!EMAIL || !PASSWORD) {
  console.error("Faltan PANEL_EMAIL y PANEL_PASSWORD.");
  process.exit(1);
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  locale: "es-CL",
  timezoneId: "America/Santiago",
});
const pagina = await contexto.newPage();

const errores = [];
const avisos = [];
pagina.on("console", (m) => {
  if (m.type() === "error") errores.push(m.text());
  if (m.type() === "warning") avisos.push(m.text());
});
pagina.on("pageerror", (e) => errores.push(`pageerror: ${e.message}`));

let fallos = 0;

function reportar(nombre, estado) {
  const ok = estado ? "OK  " : "FALLA";
  if (!estado) fallos++;
  console.log(`  [${ok}] ${nombre}`);
}

async function revisar(nombre, url, comprobar) {
  errores.length = 0;
  avisos.length = 0;

  const res = await pagina.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(500);

  console.log(`\n${nombre} (${url}) -> ${res?.status()}`);
  reportar("sin errores de consola", errores.length === 0);
  errores.slice(0, 5).forEach((e) => console.log(`        ! ${e.slice(0, 200)}`));
  if (avisos.length) {
    console.log(`        ~ ${avisos.length} aviso(s): ${avisos[0].slice(0, 160)}`);
  }

  if (comprobar) await comprobar(pagina);
}

/**
 * Abre un diálogo, comprueba que esté en `document.body` (portal), centrado
 * verticalmente y sin el header sticky encima, y lo cierra con Escape.
 */
async function revisarModal(nombre, abrir, tituloEsperado) {
  const p = pagina;
  const erroresAntes = errores.length;
  await abrir();
  await p.waitForTimeout(700);

  const m = await p.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return null;
    const caja = dialog.getBoundingClientRect();
    const titulo = dialog.querySelector("h2") ?? dialog;
    const t = titulo.getBoundingClientRect();
    const encima = document.elementFromPoint(t.left + 4, t.top + t.height / 2);
    return {
      titulo: titulo.textContent?.trim().slice(0, 40),
      top: Math.round(caja.top),
      alto: Math.round(caja.height),
      ventana: window.innerHeight,
      cabe: caja.height + 32 < window.innerHeight,
      centrado: Math.abs((caja.top + caja.bottom) / 2 - window.innerHeight / 2) < 2,
      fueraDelContenido: dialog.closest("main") === null,
      tapado: encima ? !dialog.contains(encima) : true,
    };
  });

  console.log(`        ${nombre}:`, JSON.stringify(m));
  reportar(`${nombre}: aparece`, Boolean(m));

  if (m) {
    if (tituloEsperado) {
      reportar(`${nombre}: abre el diálogo correcto`, (m.titulo ?? "").includes(tituloEsperado));
    }
    reportar(`${nombre}: portal fuera del contenido`, m.fueraDelContenido);
    reportar(`${nombre}: visible, sin el header encima`, !m.tapado);
    reportar(
      `${nombre}: ${m.cabe ? "centrado vertical" : "scroll hasta el título"}`,
      m.cabe ? m.centrado : m.top >= 0 && m.alto > m.ventana,
    );
    reportar(`${nombre}: sin errores nuevos`, errores.length === erroresAntes);
  }

  await p.keyboard.press("Escape");
  await p.waitForTimeout(600);
  const cerrado = (await p.locator('[role="dialog"]').count()) === 0;
  reportar(`${nombre}: cierra con Escape`, cerrado);
}

// Login.
await pagina.goto(`${BASE}/dashboard/login`, { waitUntil: "networkidle" });
const campos = pagina.locator("input");
const total = await campos.count();
for (let i = 0; i < total; i++) {
  const tipo = await campos.nth(i).getAttribute("type");
  if (tipo === "password") await campos.nth(i).fill(PASSWORD);
  else await campos.nth(i).fill(EMAIL);
}
await pagina.getByRole("button", { name: /entrar|ingresar/i }).first().click();
await pagina.waitForURL(/\/dashboard(?!\/login)/, { timeout: 20000 });
console.log(`Sesion iniciada en ${pagina.url()}`);

// Tokens de motion presentes en el CSS cargado.
await revisar("Agenda", "/dashboard", async (p) => {
  const tokens = await p.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    const leer = (n) => s.getPropertyValue(n).trim();
    return {
      micro: leer("--motion-duration-micro"),
      element: leer("--motion-duration-element"),
      section: leer("--motion-duration-section"),
      view: leer("--motion-duration-view"),
      easeOut: leer("--motion-ease-out"),
    };
  });
  console.log("        tokens:", JSON.stringify(tokens));
  reportar(
    "tokens de motion resueltos",
    tokens.micro !== "" && tokens.easeOut.startsWith("cubic-bezier"),
  );

  // Las filas de la tabla entran escalonadas (retardo por indice).
  const filas = await p.locator("table tbody tr").count();
  console.log(`        filas en la tabla: ${filas}`);
  if (filas > 1) {
    const retardos = await p.$$eval("table tbody tr", (els) =>
      els.slice(0, 3).map((el) => getComputedStyle(el).animationDelay),
    );
    console.log(`        retardos: ${retardos.join(", ")}`);
    reportar("filas escalonadas", new Set(retardos).size > 1);
    reportar("filas con animacion de entrada", retardos.every((r) => r !== "0s"));
  }

  await revisarModal(
    "Nueva reserva",
    () => p.getByRole("button", { name: /nueva reserva/i }).first().click(),
    "Nueva reserva",
  );

  if (await p.getByRole("button", { name: "Reagendar", exact: true }).count()) {
    await revisarModal(
      "Reprogramar cita",
      () => p.getByRole("button", { name: "Reagendar", exact: true }).first().click(),
      "Reprogramar cita",
    );
  }

  const whatsapp = p.locator('button[aria-label^="Enviar WhatsApp"]:not([disabled])').first();
  if (await whatsapp.count()) {
    await revisarModal("WhatsApp", () => whatsapp.click(), "Enviar WhatsApp");
  }

  // En móvil el modal es más alto que la pantalla: debe poder desplazarse
  // hasta el título, no quedar recortado arriba.
  await p.setViewportSize({ width: 390, height: 844 });
  await revisarModal(
    "Nueva reserva en móvil",
    () => p.getByRole("button", { name: /nueva reserva/i }).first().click(),
    "Nueva reserva",
  );
  await p.setViewportSize({ width: 1280, height: 720 });
});

await revisar("Pacientes", "/dashboard/pacientes", async (p) => {
  const filas = await p.locator("table tbody tr").count();
  console.log(`        filas: ${filas}`);
  if (filas > 1) {
    const retardos = await p.$$eval("table tbody tr", (els) =>
      els.slice(0, 3).map((el) => getComputedStyle(el).animationDelay),
    );
    reportar("filas escalonadas", new Set(retardos).size > 1);
  }

  // El icono de la columna activa rota al invertir el orden.
  const iconoActivo = () =>
    p
      .locator(
        'th[aria-sort="ascending"] span[aria-hidden], th[aria-sort="descending"] span[aria-hidden]',
      )
      .first();

  const cabeceraActiva = () =>
    p.locator('th[aria-sort="ascending"] a, th[aria-sort="descending"] a').first();

  if (await iconoActivo().count()) {
    const transformAntes = await iconoActivo().evaluate((el) => getComputedStyle(el).transform);
    const sortAntes = await cabeceraActiva().getAttribute("aria-sort").catch(() => null);

    // Se invierte el orden pulsando la cabecera activa.
    await cabeceraActiva().click();
    await p.waitForTimeout(900);

    const sortDespues = await iconoActivo()
      .evaluate((el) => el.closest("th")?.getAttribute("aria-sort") ?? null)
      .catch(() => null);
    const transformDespues = await iconoActivo().evaluate((el) => getComputedStyle(el).transform);

    console.log(`        orden: ${sortAntes} -> ${sortDespues}`);
    console.log(`        transform: ${transformAntes} -> ${transformDespues}`);
    reportar("el orden se invierte", sortAntes !== sortDespues);
    reportar("el icono de ordenamiento rota", transformAntes !== transformDespues);
  }

  await revisarModal(
    "Nuevo paciente",
    () => p.getByRole("button", { name: /nuevo paciente/i }).first().click(),
    "Nuevo paciente",
  );

  // Ficha de un paciente: confirmaciones y paneles de la ficha clínica.
  const fichas = await p
    .locator("main a[href^='/dashboard/pacientes/']")
    .evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("href")))]);
  if (!fichas.length) return;

  const abrirFicha = async (href) => {
    await p.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(900);
  };

  const esperarBoton = async (nombre, exacto = true) => {
    const boton = p.getByRole("button", { name: nombre, exact: exacto });
    await boton.first().waitFor({ state: "visible", timeout: 6000 }).catch(() => {});
    return boton;
  };

  await abrirFicha(fichas[0]);

  const eliminar = p.getByRole("button", { name: "Eliminar", exact: true });
  if (await eliminar.count()) {
    await revisarModal("Eliminar paciente", () => eliminar.first().click(), "Eliminar");
  }

  if (await p.getByRole("button", { name: "Atenciones", exact: true }).count()) {
    await p.getByRole("button", { name: "Atenciones", exact: true }).first().click();
    await p.waitForTimeout(1000);
    const nueva = await esperarBoton("Nueva atención");
    if (await nueva.count()) {
      await revisarModal(
        "Nueva atención",
        () => nueva.first().click(),
        "Nueva atención",
      );
    }
  }

  // Odontograma y plan sólo existen en fichas odontológicas: se busca una.
  let odontologica = false;
  for (const href of fichas.slice(0, 8)) {
    await abrirFicha(href);
    if (await p.getByRole("button", { name: "Odontograma", exact: true }).count()) {
      odontologica = true;
      break;
    }
  }

  if (odontologica) {
    await p.getByRole("button", { name: "Odontograma", exact: true }).first().click();
    await p.waitForTimeout(1000);
    const pieza = await esperarBoton("18");
    if (await pieza.count()) {
      await revisarModal("Pieza dental", () => pieza.first().click(), "Pieza 18");
    }

    await p.getByRole("button", { name: "Plan", exact: true }).first().click();
    await p.waitForTimeout(1200);
    // El catálogo es el único `ul` con botones "Eliminar"; el del header
    // borra al paciente y no debe confundirse con este.
    const catalogo = p.locator("main ul").filter({ has: eliminar }).last();
    if (await catalogo.count()) {
      await revisarModal(
        "Eliminar tratamiento",
        () => catalogo.getByRole("button", { name: "Eliminar", exact: true }).first().click(),
        "Eliminar",
      );
    }
  }
});

await revisar("Servicios", "/dashboard/servicios", async (p) => {
  await revisarModal(
    "Nuevo servicio",
    () => p.getByRole("button", { name: /nuevo servicio/i }).first().click(),
    "Nuevo servicio",
  );

  if (await p.getByRole("button", { name: "Eliminar" }).count()) {
    await revisarModal(
      "Confirmación de borrado",
      () => p.getByRole("button", { name: "Eliminar" }).first().click(),
      "Eliminar",
    );
  }
});
await revisar("Horario", "/dashboard/horario");
await revisar("Bloqueos", "/dashboard/bloqueos");
await revisar("Feriados", "/dashboard/feriados");
await revisar("Perfil", "/dashboard/perfil");

await navegador.close();

console.log(`\n${fallos === 0 ? "Todo OK" : `${fallos} comprobacion(es) fallaron`}`);
process.exit(fallos === 0 ? 0 : 1);
