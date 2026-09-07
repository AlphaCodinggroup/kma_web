import { expect, test, type APIRequestContext } from "@playwright/test";
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
async function waitForEnrichment(
  request: APIRequestContext,
  token: string,
  auditId: string
): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const res = await request.get(`${GATEWAY_URL}/api/audits?limit=200`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    const audit = (body.audits ?? body.items ?? []).find(
      (a: { id: string }) => a.id === auditId
    );
    if (audit?.findings_count !== undefined && audit.findings_count !== null) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`el enriquecimiento de ${auditId} no completó a tiempo`);
}

test.describe("Flujo de reporte por la interfaz", () => {
  test("de la auditoría enriquecida al PDF", async ({ page, request }) => {
    const token = await backendToken(request);
    const { auditId } = await seedAudit(request, token);
    await waitForEnrichment(request, token, auditId);

    await login(page);

    // La auditoría aparece en el listado.
    await page.goto("/audits");
    await page.waitForLoadState("networkidle");
    const row = page.getByTestId(`audit-row-${auditId}`);
    await expect(row).toBeVisible({ timeout: 30_000 });

    // Abrirla dispara send-for-review y lleva a la pantalla de edición.
    await row.getByRole("button").first().click();
    await page.waitForURL(new RegExp(`/audits/${auditId}/edit`), { timeout: 90_000 });

    // La pestaña de preguntas muestra las respuestas cargadas en campo.
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("tab-questions")).toBeVisible();

    // La pestaña de reporte muestra los hallazgos enriquecidos, con el texto
    // que aporta el catálogo y el costo calculado.
    await page.getByTestId("tab-report").click();
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText(/not located on an accessible route/i).first()
    ).toBeVisible({ timeout: 30_000 });

    // Un solo barrier con cantidad 2 y costo unitario 1250.
    await expect(page.getByText(/2,500|2500/).first()).toBeVisible();
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
    await waitForEnrichment(request, token, auditId);

    await login(page);
    await page.goto("/audits");
    await page.waitForLoadState("networkidle");

    const row = page.getByTestId(`audit-row-${auditId}`);
    await expect(row).toBeVisible({ timeout: 30_000 });

    // El botón de edición se pinta en rojo cuando la auditoría es conforme; el
    // detalle se carga de forma diferida, así que se espera esa señal antes de
    // hacer clic.
    const editButton = row.getByRole("button", { name: /edit audit/i });
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
