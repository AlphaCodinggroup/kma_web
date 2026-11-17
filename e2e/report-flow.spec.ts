import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { login } from "./fixtures";

/**
 * Flujo de reporte desde el navegador.
 *
 * La auditoría la crea la app mobile en producción, así que acá se siembra
 * llamando al backend directamente y después se recorre por la interfaz:
 * enviar a revisión, editar un hallazgo y exportar el PDF.
 */

const GATEWAY_URL = process.env.E2E_GATEWAY_URL ?? "http://localhost:8080";
const COGNITO_URL = process.env.E2E_COGNITO_URL ?? "http://localhost:9229";
const CLIENT_ID = process.env.E2E_COGNITO_CLIENT_ID ?? "local-dev-client";

/** Obtiene un token del mock de Cognito para sembrar datos por API. */
async function backendToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${COGNITO_URL}/`, {
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
    },
    data: {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: process.env.E2E_USERNAME ?? "admin",
        PASSWORD: process.env.E2E_PASSWORD ?? "admin123",
      },
    },
  });
  expect(res.ok(), "el mock de Cognito debe autenticar").toBeTruthy();
  const body = await res.json();
  return body.AuthenticationResult.AccessToken as string;
}

/** Crea proyecto, facility y auditoría con hallazgos. Devuelve sus ids. */
async function seedAudit(request: APIRequestContext, token: string) {
  const tag = `${Date.now()}`;
  const auth = { Authorization: `Bearer ${token}` };

  const projectRes = await request.post(`${GATEWAY_URL}/api/projects`, {
    headers: auth,
    data: { name: `E2E UI Project ${tag}` },
  });
  expect(projectRes.ok()).toBeTruthy();
  const projectId = (await projectRes.json()).project_id ?? (await projectRes.json()).id;

  const facilityRes = await request.post(`${GATEWAY_URL}/api/facilities`, {
    headers: auth,
    data: {
      name: `E2E UI Facility ${tag}`,
      project_id: projectId,
      city: "Philadelphia",
    },
  });
  expect(facilityRes.ok()).toBeTruthy();
  const facilityId = (await facilityRes.json()).facility_id ?? (await facilityRes.json()).id;

  const auditId = `audit-e2e-ui-${tag}`;
  const photo = "s3://kma-audit-bucket/local-fixtures/photo.jpg";
  const auditRes = await request.post(`${GATEWAY_URL}/api/audits`, {
    headers: auth,
    data: {
      id: auditId,
      flow_id: "flow-local-curb-ramps",
      flow_version: 1,
      // El fixture entra por el alta legacy: pending_review publica el trabajo SQS.
      status: "draft_report_pending_review",
      project_id: projectId,
      facility_id: facilityId,
      answers: [
        { step_id: "CR-L01", type: "Form", values: { location: "UI entrance" } },
        { step_id: "CR-B01", type: "Question", answer: "NO" },
        { step_id: "F01", type: "Form", values: { photos: [photo], measurements: 9.5 } },
        { step_id: "CR-B02", type: "Question", answer: "YES" },
        { step_id: "CR-B03", type: "Question", answer: "YES" },
        { step_id: "CR-S01", type: "Select", answer: "Neither" },
        { step_id: "CR-QTY", type: "Form", values: { quantity: 2 } },
      ],
    },
  });
  expect(auditRes.status(), await auditRes.text()).toBe(201);

  return { auditId, projectId, facilityId };
}

/** Espera a que el worker de enriquecimiento produzca los hallazgos. */
/**
 * Busca la auditoría recorriendo el listado paginado.
 *
 * El endpoint devuelve una página más `last_eval_id` aunque se pida un limit
 * mayor: quedarse con la primera página dejaba de encontrar las auditorías
 * nuevas en cuanto la tabla crecía.
 */
async function findAudit(
  request: APIRequestContext,
  token: string,
  auditId: string
): Promise<{ findings_count?: number | null } | undefined> {
  let cursor = "";

  for (let page = 0; page < 50; page += 1) {
    const query = cursor
      ? `?limit=200&last_eval_id=${encodeURIComponent(cursor)}`
      : "?limit=200";
    const res = await request.get(`${GATEWAY_URL}/api/audits${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    const audit = (body.audits ?? body.items ?? []).find(
      (a: { id: string }) => a.id === auditId
    );
    if (audit) return audit;

    cursor = body.last_eval_id ?? "";
    if (!cursor) return undefined;
  }

  return undefined;
}

async function waitForEnrichment(
  request: APIRequestContext,
  token: string,
  auditId: string
): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const audit = await findAudit(request, token, auditId);
    if (audit?.findings_count !== undefined && audit.findings_count !== null) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`el enriquecimiento de ${auditId} no completó a tiempo`);
}


/**
 * Abre el listado y filtra por el tag de la corrida.
 *
 * El listado no ordena por fecha y pagina de a 25, así que una auditoría recién
 * creada puede caer en cualquier página: sin filtrar, el test fallaba de forma
 * intermitente a medida que la tabla crecía.
 */
async function openAuditsFilteredBy(page: Page, tag: string) {
  await page.goto("/audits");
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder(/search audits/i).fill(tag);
}

test.describe("Flujo de reporte por la interfaz", () => {
  let fixture: { token: string; auditId: string; projectId: string; facilityId: string } | undefined;

  test.afterEach(async ({ request }) => {
    if (!fixture) return;
    const { token, auditId, projectId, facilityId } = fixture;
    fixture = undefined;
    for (const path of [`audits/${auditId}`, `facilities/${facilityId}`, `projects/${projectId}`]) {
      const response = await request.delete(`${GATEWAY_URL}/api/${path}`, { headers: { Authorization: `Bearer ${token}` } });
      expect([200, 204, 404], `Clean up this test's ${path}`).toContain(response.status());
    }
  });

  test("de la auditoría enriquecida al PDF", async ({ page, request }, testInfo) => {
    const token = await backendToken(request);
    const { auditId, projectId, facilityId } = await seedAudit(request, token);
    fixture = { token, auditId, projectId, facilityId };
    await waitForEnrichment(request, token, auditId);

    await login(page);

    // La auditoría aparece en el listado.
    await openAuditsFilteredBy(page, auditId.replace("audit-e2e-ui-", ""));
    const row = page.getByTestId(`audit-row-${auditId}`);
    await expect(row).toBeVisible({ timeout: 30_000 });

    // Abrirla dispara send-for-review y lleva a la pantalla de edición.
    await row.getByRole("button").first().click();
    await page.waitForURL(new RegExp(`/audits/${auditId}/edit`), { timeout: 90_000 });

    // La pestaña de preguntas muestra las respuestas cargadas en campo.
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("tab-questions")).toBeVisible();
    const photograph = page.getByRole("img", { name: "photo.jpg", exact: true });
    await expect(photograph).toBeVisible();
    await expect.poll(() => photograph.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);

    // La pestaña de reporte muestra los hallazgos enriquecidos, con el texto
    // que aporta el catálogo y el costo calculado.
    await page.getByTestId("tab-report").click();
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText(/not located on an accessible route/i).first()
    ).toBeVisible({ timeout: 30_000 });

    // Un solo barrier con cantidad 2 y costo unitario 1250, con el formato
    // del PDF: "$2,500" en la fila y en el total de la facility.
    await expect(page.getByTestId("report-total")).toContainText("$2,500");

    // Los comentarios se guardan junto al hallazgo antes de cerrar su panel.
    await page.getByRole("button", { name: "Comments on finding 1" }).click();
    await page.getByLabel("Add a comment", { exact: true }).fill("Verified during the local UI review.");
    await page.getByRole("button", { name: "Comment", exact: true }).click();
    await expect(page.getByText("Verified during the local UI review.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Close comments panel" }).click();

    // El guardado persiste antes de aprobar y habilita las acciones al completarse.
    const quantity = page.getByRole("spinbutton", { name: "Quantity of finding 1", exact: true });
    await quantity.fill("3");
    await expect(page.getByRole("button", { name: "Approve", exact: true })).toBeDisabled();
    // La etiqueta pasa a Saving… antes de terminar: esperar la respuesta real
    // evita que reload aborte el PATCH y pierda la cantidad recién editada.
    const savedFindingResponse = page.waitForResponse(response =>
      response.request().method() === "PATCH" &&
      response.url().includes(`/api/audits-review/${auditId}/findings/`)
    );
    await page.getByRole("button", { name: "Save", exact: true }).click();
    expect((await savedFindingResponse).ok()).toBeTruthy();
    await expect(page.getByRole("button", { name: "Approve", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeHidden();
    await expect(page.getByTestId("report-total")).toContainText("$3,750");
    await page.reload();
    await expect(page.getByTestId("tab-report")).toHaveAttribute("aria-selected", "true");
    await expect(quantity).toHaveValue("3");
    await expect(page.locator(".report-paper")).toHaveCSS("background-color", "rgb(255, 255, 255)");

    // Approve genera el PDF sin descargarlo; después se descarga aparte.
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(
      page.getByRole("progressbar", { name: "Report export progress" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Report ready" })).toBeVisible({
      timeout: 120_000,
    });
    await page.getByRole("button", { name: "Close" }).click();

    const pagesBefore = page.context().pages().length;
    const downloadPromise = page.waitForEvent("download", {
      timeout: 120_000,
    });
    const downloadButton = page.getByRole("button", { name: "Download" });
    await expect(downloadButton).toBeEnabled({ timeout: 60_000 });
    await downloadButton.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    await download.saveAs(testInfo.outputPath("reviewed-project.pdf"));
    expect(page.context().pages()).toHaveLength(pagesBefore);

    // Se borra únicamente el reporte del proyecto efímero de esta corrida;
    // el PDF descargado queda conservado como evidencia del recorrido completo.
    const reportName = `E2E UI Project ${auditId.replace("audit-e2e-ui-", "")}`;
    const auth = { Authorization: `Bearer ${token}` };
    const generatedReport = await request.get(`${GATEWAY_URL}/api/reports/${auditId}`, { headers: auth });
    expect(generatedReport.status()).toBe(200);
    expect(await generatedReport.json()).toMatchObject({ id: auditId, project_id: projectId, report_name: reportName });

    await page.goto("/reports");
    await page.getByPlaceholder("Search reports...").fill(reportName);
    const reportRow = page.getByRole("row").filter({ has: page.getByText(reportName, { exact: true }) });
    await expect(reportRow).toHaveCount(1);
    await expect(reportRow).toBeVisible();
    await reportRow.getByRole("button", { name: "Delete report", exact: true }).click();
    const deleteDialog = page.getByRole("dialog", { name: "Delete report?", exact: true });
    await expect(deleteDialog).toContainText(reportName);
    const deletedReportResponse = page.waitForResponse(response =>
      response.request().method() === "DELETE" &&
      response.url().endsWith(`/api/reports/${auditId}`)
    );
    await deleteDialog.getByRole("button", { name: "Delete report", exact: true }).click();
    expect((await deletedReportResponse).status()).toBe(204);
    await expect(reportRow).toBeHidden();
    await expect(page.getByRole("status").filter({ hasText: "Report deleted." })).toBeVisible();
    const removedReport = await request.get(`${GATEWAY_URL}/api/reports/${auditId}`, { headers: auth });
    expect(removedReport.status()).toBe(404);
  });

  test("una auditoría sin hallazgos no ofrece reporte", async ({ page, request }) => {
    const token = await backendToken(request);
    const tag = `${Date.now()}`;
    const auth = { Authorization: `Bearer ${token}` };

    const projectRes = await request.post(`${GATEWAY_URL}/api/projects`, {
      headers: auth,
      data: { name: `E2E UI Compliant ${tag}` },
    });
    const projectId = (await projectRes.json()).project_id ?? (await projectRes.json()).id;

    const facilityRes = await request.post(`${GATEWAY_URL}/api/facilities`, {
      headers: auth,
      data: { name: `E2E UI Compliant Facility ${tag}`, project_id: projectId },
    });
    const facilityId = (await facilityRes.json()).facility_id ?? (await facilityRes.json()).id;

    const auditId = `audit-e2e-ui-clean-${tag}`;
    const auditRes = await request.post(`${GATEWAY_URL}/api/audits`, {
      headers: auth,
      data: {
        id: auditId,
        flow_id: "flow-local-curb-ramps",
        flow_version: 1,
        // El fixture entra por el alta legacy: pending_review publica el trabajo SQS.
        status: "draft_report_pending_review",
        project_id: projectId,
        facility_id: facilityId,
        answers: [
          { step_id: "CR-L01", type: "Form", values: { location: "Compliant entrance" } },
          { step_id: "CR-B01", type: "Question", answer: "YES" },
          { step_id: "CR-B02", type: "Question", answer: "YES" },
          { step_id: "CR-B03", type: "Question", answer: "YES" },
          { step_id: "CR-S01", type: "Select", answer: "Neither" },
          { step_id: "CR-QTY", type: "Form", values: { quantity: 1 } },
        ],
      },
    });
    expect(auditRes.status()).toBe(201);
    fixture = { token, auditId, projectId, facilityId };
    await waitForEnrichment(request, token, auditId);

    await login(page);
    await openAuditsFilteredBy(page, tag);

    const row = page.getByTestId(`audit-row-${auditId}`);
    await expect(row).toBeVisible({ timeout: 30_000 });

    // La conformidad se comunica junto a una acción neutra y espera el detalle.
    const editButton = row.getByRole("button", { name: "View audit", exact: true });
    await expect(row.getByText("Compliant", { exact: true })).toBeVisible();
    await expect(editButton).toHaveAttribute("title", /fully compliant/i, {
      timeout: 30_000,
    });

    // Sin hallazgos la aplicación avisa en vez de generar un reporte vacío.
    await editButton.click();
    await expect(
      page.getByRole("heading", { name: /no report needed/i })
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/all answers are compliant/i)).toBeVisible();
  });
});
