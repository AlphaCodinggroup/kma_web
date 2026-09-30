import { expect, type Page } from "@playwright/test";

export const CREDENTIALS = {
  username: process.env.E2E_USERNAME ?? "admin",
  password: process.env.E2E_PASSWORD ?? "admin123",
};

/** Todas las rutas de la aplicación que deben cargar autenticado. */
export const APP_ROUTES = [
  "/dashboard",
  "/audits",
  "/projects",
  "/reports",
  "/flows",
  "/users",
] as const;

/**
 * Inicia sesión por la interfaz y espera a estar en el dashboard.
 * El login pasa por el BFF, que emite la cookie httpOnly.
 */
export async function login(page: Page): Promise<void> {
  await page.goto("/login");

  const username = page.getByLabel(/username/i);
  const password = page.getByLabel(/password/i);

  await expect(username).toBeVisible();
  await username.fill(CREDENTIALS.username);
  await password.fill(CREDENTIALS.password);

  await page.getByRole("button", { name: /log ?in|sign ?in|ingresar/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

/**
 * Registra los errores que aparezcan durante la navegación.
 * Devuelve las listas para que el test las verifique al final.
 */
export function collectErrors(page: Page) {
  const consoleErrors: string[] = [];
  const serverErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      serverErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  return { consoleErrors, serverErrors };
}
