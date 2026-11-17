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
  test("alta, edición, archivo, restauración y borrado de un proyecto", async ({ page }) => {
    const { serverErrors } = collectErrors(page);
    const name = `Proyecto ${RUN}`;
    const renamed = `${name} v2`;

    await page.goto("/projects");
    await expect(
      page.getByRole("heading", { name: /^projects$/i, level: 1 }),
    ).toBeVisible();

    // Alta
    await page.getByRole("button", { name: "New Project" }).click();
    await expect(
      page.getByRole("heading", { name: "Create New Project" }),
    ).toBeVisible();
    await page.locator("#project-name").fill(name);
    await page.getByRole("button", { name: "Create Project" }).click();

    const row = page.getByRole("row").filter({ hasText: name });
    await expect(row).toBeVisible({ timeout: 20_000 });

    // Edición
    await row.getByRole("button", { name: /edit project/i }).click();
    await expect(
      page.getByRole("heading", { name: "Edit Project" }),
    ).toBeVisible();
    await page.locator("#project-name").fill(renamed);
    await page.getByRole("button", { name: "Update Project" }).click();

    const renamedRow = page.getByRole("row").filter({ hasText: renamed });
    await expect(renamedRow).toBeVisible({ timeout: 20_000 });

    await page.getByRole("searchbox", { name: "Search projects", exact: true }).fill(renamed);
    await renamedRow.getByRole("button", { name: "Archive project", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Archive", exact: true }).click();
    await expect(renamedRow).toBeHidden();
    await page.getByRole("button", { name: "Show archived projects" }).click();
    await expect(renamedRow).toBeVisible();
    await page.reload();
    await expect(page.getByRole("searchbox", { name: "Search projects", exact: true })).toHaveValue(renamed);
    await renamedRow.getByRole("button", { name: "Restore project", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Restore", exact: true }).click();
    await expect(renamedRow).toBeHidden();
    await page.getByRole("button", { name: "Show active projects" }).click();
    await expect(renamedRow).toBeVisible();

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

    let submissions = 0;
    page.on("request", request => { if (new URL(request.url()).pathname === "/api/projects" && request.method() === "POST") submissions++; });
    await submit.click();
    await expect(page.getByText(/project name is required/i)).toBeVisible();
    await expect(page.locator("#project-name")).toBeFocused();
    await expect(page.locator("#project-name")).toHaveValue("   ");
    expect(submissions).toBe(0);
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
      page.getByRole("heading", { name: "Create New Facility" }),
    ).toBeVisible();
    await page.locator("#facility-name").fill(name);
    await page.locator("#facility-address").fill("1200 Market Street");
    await page.locator("#facility-city").fill("Philadelphia");
    await page.getByRole("button", { name: "Create Facility" }).click();

    const row = page.getByRole("row").filter({ hasText: name });
    await expect(row).toBeVisible({ timeout: 20_000 });

    // Edición y persistencia de un campo opcional admitido por el backend.
    await row.getByRole("button", { name: /edit facility/i }).click();
    await expect(
      page.getByRole("heading", { name: "Edit Facility" }),
    ).toBeVisible();
    await page.locator("#facility-city").fill("Pittsburgh");
    await page.locator("#facility-description").fill("Descripción del e2e");
    await page.getByRole("button", { name: "Update Facility" }).click();

    const updated = page.getByRole("row").filter({ hasText: name });
    await expect(updated).toContainText("Pittsburgh", { timeout: 20_000 });

    await updated.getByRole("button", { name: /edit facility/i }).click();
    await expect(page.locator("#facility-description")).toHaveValue(
      "Descripción del e2e",
    );

    // Vaciar un campo opcional lo borra: antes se omitía del payload y el
    // backend conservaba el valor viejo. address y city no aplican porque el
    // formulario los exige.
    await page.locator("#facility-description").fill("");
    await page.getByRole("button", { name: "Update Facility" }).click();

    await expect(
      page.getByRole("heading", { name: "Edit Facility" }),
    ).toBeHidden({ timeout: 20_000 });
    await updated.getByRole("button", { name: /edit facility/i }).click();
    await expect(page.locator("#facility-description")).toHaveValue("");
    await page
      .getByRole("button", { name: /close|cancel/i })
      .first()
      .click();

    // Archivar, recargar el listado archivado y restaurar comprueba que el
    // estado persiste en backend antes del borrado definitivo.
    await updated.getByRole("button", { name: /archive facility/i }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Archive", exact: true })
      .click();
    await expect(updated).toBeHidden({ timeout: 20_000 });

    await page
      .getByRole("button", { name: "Show archived facilities" })
      .click();
    const archived = page.getByRole("row").filter({ hasText: name });
    await expect(archived).toBeVisible({ timeout: 20_000 });
    await archived.getByRole("button", { name: /restore facility/i }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Restore", exact: true })
      .click();
    await expect(archived).toBeHidden({ timeout: 20_000 });

    await page.getByRole("button", { name: "Show active facilities" }).click();
    const restored = page.getByRole("row").filter({ hasText: name });
    await expect(restored).toBeVisible({ timeout: 20_000 });

    await restored.getByRole("button", { name: /delete facility/i }).click();
    await page
      .getByRole("button", { name: /^delete|^confirm/i })
      .last()
      .click();
    await expect(restored).toBeHidden({ timeout: 20_000 });

    expect(serverErrors).toEqual([]);
  });
});

test.describe("Usuarios", () => {
  test("alta, edición de rol y borrado de un usuario", async ({ page }) => {
    const { serverErrors } = collectErrors(page);
    const name = `QC ${RUN}`;
    const email = `qc-${Date.now()}@example.com`;

    await page.goto("/users");
    await expect(
      page.getByRole("heading", { name: /user management/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: /add user/i }).click();
    await expect(
      page.getByRole("heading", { name: "Add New User" }),
    ).toBeVisible();

    await page.locator("#user-username").fill(name);
    await page.locator("#user-email").fill(email);
    // El valor del rol es el nombre del grupo de Cognito: "qc", no "qc_manager".
    await page.locator("#user-role").selectOption("qc");
    await page.locator("#user-password").fill("S3cret!2026");
    await page.getByRole("button", { name: "Create User" }).click();

    // El alta con rol QC tiene que funcionar: es el rol que revisa el reporte.
    await expect(
      page.getByRole("heading", { name: "User Created" }),
    ).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: "Close" }).click();

    const row = page.getByRole("row").filter({ hasText: email });
    await expect(row).toBeVisible({ timeout: 20_000 });

    await row.getByRole("button", { name: "Edit user", exact: true }).click();
    await page.locator("#user-role").selectOption("auditor");
    await page.getByRole("button", { name: "Save Changes", exact: true }).click();
    await expect(page.getByRole("heading", { name: "User Updated", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(row.getByText("Auditor", { exact: true })).toBeVisible();
    await row.getByRole("button", { name: "Edit user", exact: true }).click();
    await expect(page.locator("#user-role")).toHaveValue("auditor");
    await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();

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
      page.getByRole("heading", { level: 1, name: /^Edit Flow: / }),
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
      page.getByRole("main").getByRole("heading", { name: "Reports" }).first(),
    ).toBeVisible();

    const search = page.getByPlaceholder(/search reports/i);
    await expect(search).toBeVisible();
    const reportRows = page.getByRole("row").filter({
      has: page.getByRole("button", { name: "Delete report", exact: true }),
    });
    await expect(reportRows.first()).toBeVisible();
    await search.fill("zzzznada");

    // Se cuentan reportes reales; la fila de vacío también tiene role=row.
    await expect(reportRows).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "No reports found", exact: true })).toBeVisible();
    await search.fill("");
    await expect(reportRows.first()).toBeVisible();

    expect(serverErrors).toEqual([]);
  });
});
