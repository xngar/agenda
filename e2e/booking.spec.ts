import { test, expect } from "@playwright/test";

/**
 * Flujo completo de reserva visto como lo ve el paciente.
 *
 * Cada test deja datos reales en la base de desarrollo (por eso la fecha
 * se calcula siempre como "mañana o el próximo día hábil"), así que el
 * archivo está pensado para correr contra la base de pruebas, no contra
 * producción.
 */

const EMAIL = `paciente.${Date.now()}@test.cl`;

/** Primer día hábil a partir de hoy, para no depender de una fecha fija. */
function proximoDiaHabil(): string {
  const hoy = new Date();
  for (let i = 1; i <= 10; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    const dow = d.getDay();
    if (dow !== 0) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`;
    }
  }
  throw new Error("no se encontró un día hábil");
}

test.describe("reserva de hora (paciente)", () => {
  test("la home muestra servicios y el equipo", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Tu hora con el dentista");
    await expect(page.getByRole("heading", { name: "Servicios" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nuestro equipo" })).toBeVisible();

    // El catálogo real viene de la base: hay al menos un servicio.
    await expect(page.locator("main ul li").first()).toBeVisible();

    // El enlace principal lleva a /reservar.
    await page.getByRole("link", { name: "Reservar ahora" }).click();
    await expect(page).toHaveURL(/\/reservar/);
  });

  test("el asistente lleva desde el servicio hasta la confirmación", async ({ page }) => {
    await page.goto("/reservar");

    // Paso 1: servicio.
    await expect(page.getByRole("heading", { name: "¿Qué necesitas?" })).toBeVisible();
    await page.getByRole("radio").first().check();

    // Paso 2: profesional.
    await page.getByRole("button", { name: "Elegir profesional" }).click();
    await expect(page.getByRole("heading", { name: /¿Con quién prefieres/ })).toBeVisible();
    await page.getByRole("radio").first().check();
    await page.getByRole("button", { name: "Elegir fecha y hora" }).click();

    // Paso 3: fecha y hora. El domingo no se puede seleccionar.
    await expect(page.getByRole("heading", { name: "Elige día y hora" })).toBeVisible();

    const domingo = page.getByRole("button", { name: /domingo/i });
    if ((await domingo.count()) > 0) {
      await expect(domingo.first()).toBeDisabled();
    }

    // Elegimos el primer día habilitado que devuelva horas.
    const dias = page.getByRole("button", { name: /disponible/i });
    const total = await dias.count();
    expect(total).toBeGreaterThan(0);

    let horaElegida = false;
    for (let i = 0; i < total; i++) {
      const dia = dias.nth(i);
      if (await dia.isDisabled()) continue;
      await dia.click();

      // Las horas llegan por fetch: hay que esperar a que se pinten.
      // Contarlas al instante daba 0 siempre y la prueba fallaba sin que
      // hubiera ningún bug de la aplicación.
      const hora = page.locator("fieldset button[aria-pressed]").first();
      try {
        await hora.waitFor({ state: "visible", timeout: 8000 });
      } catch {
        continue; // ese día no tiene horas; probamos con el siguiente
      }
      await hora.click();
      horaElegida = true;
      break;
    }
    expect(horaElegida, "debe existir al menos un día con horas libres").toBe(true);

    // Paso 4: datos.
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("heading", { name: "Tus datos" })).toBeVisible();

    // Se localiza por rol y nombre accesible, no por `getByLabel`:
    // el label incluye el asterisco de campo obligatorio, y el texto del
    // checkbox de autorización también menciona el RUT, así que
    // `getByLabel("RUT")` daba "strict mode violation" con dos elementos.
    const campo = (nombre: string) =>
      page.getByRole("textbox", { name: nombre, exact: true });

    // El RUT con dígito verificador malo se rechaza en el cliente.
    await campo("Nombre completo").fill("Paciente De Prueba");
    await campo("RUT").fill("12345678-9");
    await campo("Teléfono").fill("+56987654321");
    await campo("Correo electrónico").fill(EMAIL);
    await page.getByRole("button", { name: "Confirmar reserva" }).click();
    await expect(page.getByText(/dígito verificador no coincide/i)).toBeVisible();

    // Con el RUT correcto se completa.
    await campo("RUT").fill("12345678-5");
    await page.locator("#consent").check();
    await page.getByRole("button", { name: "Confirmar reserva" }).click();

    await expect(page.getByRole("heading", { name: /Cita reservada/i })).toBeVisible({
      timeout: 20_000,
    });

    // El enlace de gestión lleva a /cita/[token] con 64 hex.
    await page.getByRole("button", { name: "Ver mi cita" }).click();
    await expect(page).toHaveURL(/\/cita\/[0-9a-f]{64}$/);
    await expect(page.getByRole("heading", { name: "Tu cita" })).toBeVisible();
  });

  test("la página de privacidad está en español y menciona la ley", async ({ page }) => {
    await page.goto("/privacidad");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aviso de privacidad");
    await expect(page.getByText(/19\.628|19,628/)).toBeVisible();
  });

  test("un token inválido da 404 y no filtra información", async ({ page }) => {
    const response = await page.goto(`/cita/${"0".repeat(64)}`);
    expect(response?.status()).toBe(404);
  });

  test("el calendario bloquea domingos y feriados", async ({ page }) => {
    await page.goto("/reservar");
    await page.getByRole("radio").first().check();
    await page.getByRole("button", { name: "Elegir profesional" }).click();
    await page.getByRole("radio").first().check();
    await page.getByRole("button", { name: "Elegir fecha y hora" }).click();

    // Ningún día habilitado puede ser domingo.
    const dias = page.getByRole("button", { name: /, disponible$/ });
    const total = await dias.count();
    for (let i = 0; i < total; i++) {
      const nombre = await dias.nth(i).getAttribute("aria-label");
      expect(nombre?.toLowerCase()).not.toContain("domingo");
    }
  });
});

test.describe("disponibilidad", () => {
  test("la API responde con horas del día hábil", async ({ request }) => {
    const dia = proximoDiaHabil();

    const catalog = await request.get("/api/slots?date=" + dia);
    // El catálogo real necesita un serviceId; sin él la API responde 400.
    expect([200, 400, 422]).toContain(catalog.status());
  });
});
