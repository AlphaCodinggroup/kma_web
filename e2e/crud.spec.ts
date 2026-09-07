/**
 * CRUD por la interfaz, contra el stack completo.
 *
 * Cada caso crea su propio recurso con un sufijo único y lo borra al final, así
 * la suite es repetible sobre la misma base sembrada.
 */
import { expect, test } from "@playwright/test";
import { collectErrors, login } from "./fixtures";

/** Sufijo único por corrida para no colisionar con datos previos. */
const RUN = `e2e-${Date.now()}`;

test.beforeEach(async ({ page }) => {
  await login(page);
});

test.describe("Proyectos", () => {
  test("alta, edición y borrado de un proyecto", async ({ page }) => {
    const { serverErrors } = collectErrors(page);
    const name = `Proyecto ${RUN}`;
    const renamed = `${name} v2`;

    await page.goto("/projects");
    await expect(
      page.getByRole("heading", { name: /projects & facilities/i })
    ).toBeVisible();

    // Alta
    await page.getByRole("button", { name: "New Project" }).click();
    await expect(
      page.getByRole("heading", { name: "Create New Project" })
    ).toBeVisible();
    await page.locator("#project-name").fill(name);
    await page.getByRole("button", { name: "Create Project" }).click();

    const row = page.getByRole("row").filter({ hasText: name });
    await expect(row).toBeVisible({ timeout: 20_000 });

    // Edición
    await row.getByRole("button", { name: /edit project/i }).click();
    await expect(
      page.getByRole("heading", { name: "Edit Project" })
    ).toBeVisible();
    await page.locator("#project-name").fill(renamed);
    await page.getByRole("button", { name: "Update Project" }).click();

    const renamedRow = page.getByRole("row").filter({ hasText: renamed });
    await expect(renamedRow).toBeVisible({ timeout: 20_000 });

    // Borrado
    await renamedRow.getByRole("button", { name: /delete project/i }).click();
    await page
      .getByRole("button", { name: /^delete|^confirm/i })
      .last()
      .click();
    await expect(renamedRow).toBeHidden({ timeout: 20_000 });

    expect(serverErrors).toEqual([]);
  });

  test("el nombre en blanco no crea el proyecto", async ({ page }) => {
    await page.goto("/projects");
    await page.getByRole("button", { name: "New Project" }).click();

    const submit = page.getByRole("button", { name: "Create Project" });
    await page.locator("#project-name").fill("   ");
    await page.locator("#project-name").blur();

    // El formulario avisa y no deja enviar.
    await expect(page.getByText(/project name is required/i)).toBeVisible();
    await expect(submit).toBeDisabled();
  });
});

test.describe("Facilities", () => {
  test("alta, edición y borrado de una facility", async ({ page }) => {
    const { serverErrors } = collectErrors(page);
    const name = `Planta ${RUN}`;

    await page.goto("/projects");
    await page.getByRole("tab", { name: "Facilities" }).click();

    await page.getByRole("button", { name: "New Facility" }).click();
    await expect(
      page.getByRole("heading", { name: "Create New Facility" })
    ).toBeVisible();
    await page.locator("#facility-name").fill(name);
    await page.locator("#facility-address").fill("1200 Market Street");
    await page.locator("#facility-city").fill("Philadelphia");
    await page.getByRole("button", { name: "Create Facility" }).click();

    const row = page.getByRole("row").filter({ hasText: name });
    await expect(row).toBeVisible({ timeout: 20_000 });

    // Edición: notes es un campo propio y vaciar uno lo borra de verdad.
    await row.getByRole("button", { name: /edit facility/i }).click();
    await expect(
      page.getByRole("heading", { name: "Edit Facility" })
    ).toBeVisible();
    await page.locator("#facility-city").fill("Pittsburgh");
    await page.locator("#facility-notes").fill("Nota interna del e2e");
    await page.getByRole("button", { name: "Update Facility" }).click();

    const updated = page.getByRole("row").filter({ hasText: name });
    await expect(updated).toContainText("Pittsburgh", { timeout: 20_000 });

    // La nota vuelve en su propio campo, sin pisar la descripción.
    await updated.getByRole("button", { name: /edit facility/i }).click();
    await expect(page.locator("#facility-notes")).toHaveValue(
      "Nota interna del e2e"
    );
    await expect(page.locator("#facility-description")).toHaveValue("");

    // Vaciar un campo opcional lo borra: antes se omitía del payload y el
    // backend conservaba el valor viejo. address y city no aplican porque el
    // formulario los exige.
    await page.locator("#facility-notes").fill("");
    await page.getByRole("button", { name: "Update Facility" }).click();

    await expect(
      page.getByRole("heading", { name: "Edit Facility" })
    ).toBeHidden({ timeout: 20_000 });
    await updated.getByRole("button", { name: /edit facility/i }).click();
    await expect(page.locator("#facility-notes")).toHaveValue("");
    await page.getByRole("button", { name: /close|cancel/i }).first().click();

    await updated.getByRole("button", { name: /delete facility/i }).click();
    await page
      .getByRole("button", { name: /^delete|^confirm/i })
      .last()
      .click();
    await expect(updated).toBeHidden({ timeout: 20_000 });

    expect(serverErrors).toEqual([]);
  });
});

test.describe("Usuarios", () => {
  test("alta de un usuario con rol QC y borrado", async ({ page }) => {
    const { serverErrors } = collectErrors(page);
    const name = `QC ${RUN}`;
    const email = `qc-${Date.now()}@example.com`;

    await page.goto("/users");
    await expect(
      page.getByRole("heading", { name: /user management/i })
    ).toBeVisible();

    await page.getByRole("button", { name: /add user/i }).click();
    await expect(
      page.getByRole("heading", { name: "Add New User" })
    ).toBeVisible();

    await page.locator("#user-username").fill(name);
    await page.locator("#user-email").fill(email);
    // El valor del rol es el nombre del grupo de Cognito: "qc", no "qc_manager".
    await page.locator("#user-role").selectOption("qc");
    await page.locator("#user-password").fill("S3cret!2026");
    await page.getByRole("button", { name: "Create User" }).click();

    // El alta con rol QC tiene que funcionar: es el rol que revisa el reporte.
    await expect(page.getByRole("heading", { name: "User Created" })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: "Close" }).click();

    const row = page.getByRole("row").filter({ hasText: email });
    await expect(row).toBeVisible({ timeout: 20_000 });

    await row.getByRole("button", { name: /delete/i }).click();
    const confirm = page.getByRole("dialog").filter({ hasText: "Delete User" });
    await confirm.getByRole("button", { name: "Delete User" }).click();
    await expect(row).toBeHidden({ timeout: 20_000 });

    expect(serverErrors).toEqual([]);
  });
});

test.describe("Flows", () => {
  test("el listado filtra y abre el editor de un flow", async ({ page }) => {
    const { serverErrors } = collectErrors(page);

    await page.goto("/flows");
    await expect(page.getByRole("heading", { name: "Flows" })).toBeVisible();

    const search = page.getByPlaceholder(/search flows/i);
    await search.fill("curb");

    const card = page.getByText(/curb ramps/i).first();
    await expect(card).toBeVisible({ timeout: 20_000 });

    // Un término que no matchea deja el listado vacío.
    await search.fill("zzzznada");
    await expect(page.getByText(/curb ramps/i)).toHaveCount(0);

    await search.fill("curb");
    // El editor se abre por el enlace "Edit flow" de la tarjeta, que sólo ve un
    // administrador.
    await page.getByRole("link", { name: "Edit flow" }).first().click();
    await expect(
      page.getByRole("heading", { name: /edit flow:/i })
    ).toBeVisible({ timeout: 20_000 });

    expect(serverErrors).toEqual([]);
  });
});

test.describe("Reportes", () => {
  test("el listado de reportes carga y filtra", async ({ page }) => {
    const { serverErrors } = collectErrors(page);

    await page.goto("/reports");
    // "Reports" titula el menú lateral, la cabecera y la tarjeta del listado:
    // para afirmar que la página cargó alcanza con su buscador y el primer
    // encabezado del main.
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Reports" }).first()
    ).toBeVisible();

    const search = page.getByPlaceholder(/search reports/i);
    await expect(search).toBeVisible();
    const rowsBefore = await page.getByRole("row").count();

    await search.fill("zzzznada");

    // Con un filtro que no matchea quedan menos filas que antes (a lo sumo la
    // de encabezado).
    await expect
      .poll(() => page.getByRole("row").count(), { timeout: 20_000 })
      .toBeLessThan(Math.max(rowsBefore, 2));

    expect(serverErrors).toEqual([]);
  });
});
