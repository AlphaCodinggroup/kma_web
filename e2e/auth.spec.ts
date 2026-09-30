import { expect, test } from "@playwright/test";
import { CREDENTIALS, login } from "./fixtures";

test.describe("Autenticación", () => {
  test("una ruta protegida redirige al login sin sesión", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("la raíz lleva al login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("credenciales inválidas no inician sesión", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/username/i).fill(CREDENTIALS.username);
    await page.getByLabel(/password/i).fill("contraseña-incorrecta");
    await page.getByRole("button", { name: /log ?in|sign ?in|ingresar/i }).click();

    // Sigue en el login y se muestra un mensaje de error.
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/incorrect|invalid|error/i).first()).toBeVisible();
  });

  test("credenciales válidas entran al dashboard", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  });

  test("la sesión sobrevive una recarga", async ({ page }) => {
    await login(page);
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
