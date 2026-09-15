import { expect, test } from "@playwright/test";
import { APP_ROUTES, collectErrors, login } from "./fixtures";

test.describe("Navegación", () => {
  test("todas las rutas cargan sin errores de servidor", async ({ page }) => {
    await login(page);
    const { consoleErrors, serverErrors } = collectErrors(page);

    for (const route of APP_ROUTES) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`${route}$`));
      // La página terminó de resolver sus datos.
      await page.waitForLoadState("networkidle");
      await expect(page.locator("body")).toBeVisible();
    }

    expect(serverErrors, `respuestas 5xx: ${serverErrors.join(", ")}`).toEqual([]);

    // Se ignoran los avisos de recursos externos que no dependen del código.
    const relevantes = consoleErrors.filter(
      (e) => !/favicon|Download the React DevTools/i.test(e)
    );
    expect(relevantes, `errores de consola: ${relevantes.join(" | ")}`).toEqual([]);
  });

  test("el menú lateral navega entre secciones", async ({ page }) => {
    await login(page);

    for (const [label, url] of [
      [/projects/i, /\/projects/],
      [/audits/i, /\/audits/],
      [/reports/i, /\/reports/],
    ] as const) {
      await page.getByRole("link", { name: label }).first().click();
      await expect(page).toHaveURL(url);
    }
  });
});
