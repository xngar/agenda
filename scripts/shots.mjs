import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3111";
const OUT = process.argv[2] ?? "C:/Users/xngar/AppData/Local/Temp/opencode/shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: "es-CL" });

const errores = [];
page.on("console", (m) => m.type() === "error" && errores.push(m.text()));
page.on("pageerror", (e) => errores.push(String(e)));

async function shot(nombre, url, full = true) {
  // `networkidle` nunca converge aquí; se espera al contenido real.
  await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
  await page.locator("main").waitFor({ state: "visible" });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${nombre}.png`, fullPage: full });
  console.log(`  ${nombre}.png`);
}

console.log("Capturando en", OUT);
await shot("01-home", "/");
await shot("02-reservar-paso1", "/reservar");
await shot("03-privacidad", "/privacidad");

// Paso 2 del asistente (hay que volver a /reservar tras capturar privacidad)
await page.goto(`${BASE}/reservar`, { waitUntil: "domcontentloaded" });
await page.locator("main").waitFor({ state: "visible" });
await page.waitForTimeout(600);
await page.getByRole("radio").first().check();
await page.getByRole("button", { name: "Elegir profesional" }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/04-reservar-paso2.png`, fullPage: true });
console.log("  04-reservar-paso2.png");

// Paso 3 con horas reales cargadas
await page.getByRole("radio").first().check();
await page.getByRole("button", { name: "Elegir fecha y hora" }).click();
await page.waitForTimeout(300);
const dias = page.getByRole("button", { name: /, disponible$/ });
for (let i = 0; i < (await dias.count()); i++) {
  const d = dias.nth(i);
  if (await d.isDisabled()) continue;
  await d.click();
  await page.waitForTimeout(900);
  if ((await page.locator("fieldset button[aria-pressed]").count()) > 0) break;
}
await page.screenshot({ path: `${OUT}/05-reservar-horas.png`, fullPage: true });
console.log("  05-reservar-horas.png");

// Vista móvil
const movil = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: "es-CL" });
await movil.goto(`${BASE}/reservar`, { waitUntil: "domcontentloaded" });
await movil.locator("main").waitFor({ state: "visible" });
await movil.waitForTimeout(900);
await movil.screenshot({ path: `${OUT}/06-movil-reservar.png`, fullPage: true });
console.log("  06-movil-reservar.png");

console.log("\nErrores de consola:", errores.length ? errores : "ninguno");
await browser.close();
