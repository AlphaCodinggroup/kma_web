import { expect, test, type Page, type APIRequestContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { CatalogOperation, CatalogStatus, CatalogItemInput } from '../src/entities/catalog/model/catalog';
import { login } from './fixtures';

// Solo se permite escribir al habilitarlo explícitamente sobre un entorno local aislado.
const enabled = process.env.CATALOG_E2E_MUTATIONS === '1';
const local = new URL(process.env.E2E_BASE_URL ?? 'http://localhost:3000');
test.skip(!enabled || !['localhost', '127.0.0.1'].includes(local.hostname), 'Requires an explicitly enabled isolated local catalog');

async function status(request: APIRequestContext): Promise<CatalogStatus> {
  const response = await request.get('/api/catalog/status');
  expect(response.status()).toBe(200);
  return response.json();
}
async function completed(request: APIRequestContext, id: string) {
  let operation: CatalogOperation | undefined;
  await expect.poll(async () => {
    const response = await request.get(`/api/catalog/operations/${id}`);
    expect(response.status()).toBe(200);
    operation = await response.json();
    return operation?.status;
  }, { timeout: 90_000, intervals: [250, 1000, 2000] }).toBe('completed');
  return operation!;
}
async function restore(request: APIRequestContext, version: string) {
  const current = await status(request);
  const response = await request.post('/api/catalog/activate', { data: { version, expected_revision: current.revision, operation_id: randomUUID() } });
  expect(response.status()).toBe(200);
}
async function filter(page: Page, query: string) {
  await page.getByLabel('Search catalog', { exact: true }).fill(query);
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
}
async function fillRecord(page: Page, suffix: string) {
  const dialog = page.getByRole('dialog', { name: 'Add mitigation', exact: true });
  for (const [label, value] of [
    ['Flow ID', 'QA-CATALOG'], ['Barrier ID', `QA-${suffix}`], ['Question code', suffix],
    ['Question', `QA question ${suffix}`], ['Mitigation ID', 'QA-SHARED'],
    ['Barrier', 'QA barrier'], ['Mitigation', `QA solution ${suffix}`], ['Reference', 'ADAS QA'], ['Unit', 'EA'],
  ]) await dialog.getByLabel(label, { exact: true }).fill(value);
  await dialog.getByLabel('Cost', { exact: true }).fill('0');
}
async function save(page: Page) {
  const response = page.waitForResponse(r => r.url().includes('/api/catalog/items') && ['POST', 'PUT'].includes(r.request().method()));
  await page.getByRole('dialog').getByRole('button', { name: 'Save mitigation', exact: true }).click();
  const accepted = await response;
  expect(accepted.status()).toBe(202);
  const op: CatalogOperation = await accepted.json();
  const done = await completed(page.request, op.operation_id);
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 20_000 });
  return done;
}

test('catalog CRUD, shared codes, export/import, conflicts, recovery and historical safety', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  await login(page);
  const original = await status(page.request);
  const consoleIssues: string[] = [];
  page.on('console', message => { if (['warning', 'error'].includes(message.type())) consoleIssues.push(message.text()); });
  page.on('pageerror', error => consoleIssues.push(error.message));
  try {
    await page.goto('/catalog');
    await page.getByLabel('XLSX file', { exact: true }).setInputFiles(path.resolve('../kma-backend/lambdas/catalog/data/catalog-import.xlsx'));
    await page.getByRole('button', { name: 'Validate file', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Validation preview' })).toBeVisible();
    const unchanged = await status(page.request);
    expect(unchanged.active_version).toBe(original.active_version);
    await page.getByRole('button', { name: 'Replace catalog', exact: true }).click();
    const importing = page.waitForResponse(r => r.url().endsWith('/api/catalog/imports') && r.request().method() === 'POST');
    await page.getByRole('dialog').getByRole('button', { name: 'Replace catalog', exact: true }).click();
    const importResponse = await importing;
    expect(importResponse.status()).toBe(202);
    const imported = await completed(page.request, (await importResponse.json()).operation_id);
    await expect(page.getByRole('button', { name: 'Add mitigation' })).toBeEnabled();
    await expect(page).toHaveURL(new RegExp(imported.version!));
    await filter(page, 'QA-CATALOG');

    for (const suffix of ['QA1', 'QA2']) {
      await page.getByRole('button', { name: 'Add mitigation', exact: true }).click();
      await fillRecord(page, suffix);
      await save(page);
      await expect(page.getByRole('row').filter({ hasText: `QA question ${suffix}` })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Edit QA1', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Question code', { exact: true }).fill('QA1-EDIT');
    await page.getByRole('dialog').getByLabel('Mitigation', { exact: true }).fill('Edited one row only');
    await page.getByRole('dialog').getByLabel('Cost', { exact: true }).fill('');
    const edited = await save(page);
    const recordsResponse = await page.request.get('/api/catalog/items?q=QA-CATALOG');
    const records = (await recordsResponse.json()).items;
    expect(records).toHaveLength(2);
    expect(records.find((r: { question_code: string }) => r.question_code === 'QA1-EDIT')).toMatchObject({ cost: null, proposed_mitigation: 'Edited one row only' });
    expect(records.find((r: { question_code: string }) => r.question_code === 'QA2')).toMatchObject({ cost: 0, proposed_mitigation: 'QA solution QA2' });

    // El export debe incluir todas las filas aunque la pantalla solo muestre dos.
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Excel', exact: true }).click();
    const download = await downloading;
    const file = testInfo.outputPath('catalog-roundtrip.xlsx');
    await download.saveAs(file);
    const content = await readFile(file);
    expect(content.subarray(0, 2).toString()).toBe('PK');
    const validation = await page.request.post('/api/catalog/validate', { data: { file_name: 'catalog-roundtrip.xlsx', file_content: content.toString('base64') } });
    expect(validation.status()).toBe(200);
    expect((await validation.json()).item_count).toBe(1845);

    // Una revisión obsoleta conserva el formulario y exige revisión explícita.
    await page.getByRole('button', { name: 'Edit QA2', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Mitigation', { exact: true }).fill('Conflict draft preserved');
    await restore(page.request, imported.version!);
    const conflicting = page.waitForResponse(r => r.request().method() === 'PUT' && r.url().includes('/api/catalog/items/'));
    await page.getByRole('dialog').getByRole('button', { name: 'Save mitigation', exact: true }).click();
    expect((await conflicting).status()).toBe(409);
    await expect(page.getByRole('dialog').getByLabel('Mitigation', { exact: true })).toHaveValue('Conflict draft preserved');
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Use current catalog' })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.goto(`/catalog?version=${edited.version}&q=QA-CATALOG`);
    await expect(page.getByRole('button', { name: 'Add mitigation' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Edit QA2', exact: true })).toBeDisabled();
    await restore(page.request, edited.version!);
    await page.goto('/catalog?q=QA-CATALOG');

    // Recargar inmediatamente después de aceptar la operación conserva su seguimiento.
    await page.getByRole('button', { name: 'Edit QA2', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Mitigation', { exact: true }).fill('Recovered after reload');
    const accepting = page.waitForResponse(r => r.request().method() === 'PUT' && r.url().includes('/api/catalog/items/'));
    await page.getByRole('dialog').getByRole('button', { name: 'Save mitigation', exact: true }).click();
    const pending: CatalogOperation = await (await accepting).json();
    await page.reload();
    await completed(page.request, pending.operation_id);
    await expect(page.getByRole('button', { name: 'Edit QA2', exact: true })).toBeEnabled({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Details QA2', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Catalog record details' })).toContainText('Recovered after reload');

    await page.getByRole('button', { name: 'Delete QA2', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Delete mitigation?' })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Delete QA2', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Delete QA2', exact: true }).click();
    const deleting = page.waitForResponse(r => r.request().method() === 'DELETE' && r.url().includes('/api/catalog/items/'));
    await page.getByRole('dialog').getByRole('button', { name: 'Delete mitigation', exact: true }).click();
    const deleted = await deleting;
    expect(deleted.status()).toBe(202);
    await completed(page.request, (await deleted.json()).operation_id);
    await expect(page.getByRole('button', { name: 'Delete QA2', exact: true })).toBeHidden({ timeout: 20_000 });
    expect(consoleIssues.filter(message => !message.includes('409'))).toEqual([]);
  } finally {
    await restore(page.request, original.active_version);
  }
});

test('catalog desktop/mobile accessibility and keyboard dialog controls', async ({ page }) => {
  await login(page);
  await page.goto('/catalog');
  await expect(page.getByRole('button', { name: 'Add mitigation' })).toBeEnabled();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const violations = await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(violations.violations).toEqual([]);
    await page.getByRole('button', { name: 'Add mitigation' }).click();
    await expect(page.getByRole('dialog', { name: 'Add mitigation' })).toBeVisible();
    const modal = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(modal.violations).toEqual([]);
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('dialog')).toContainText('Save mitigation');
    const focusedInside = await page.evaluate(() => Boolean(document.querySelector('[role="dialog"]')?.contains(document.activeElement)));
    expect(focusedInside).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Add mitigation' })).toBeFocused();
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    expect(fits).toBe(true);
  }
});

test('catalog rejects anonymous, non-admin, cross-origin and malformed requests', async ({ browser }) => {
  const anonymous = await browser.newContext({ baseURL: local.origin });
  const auditor = await browser.newContext({ baseURL: local.origin });
  const admin = await browser.newContext({ baseURL: local.origin });
  try {
    for (const endpoint of ['/api/catalog/items', '/api/catalog/export']) {
      const response = await anonymous.request.get(endpoint);
      expect(response.status()).toBe(401);
    }
    const viewer = await auditor.newPage();
    await viewer.goto('/login');
    await viewer.getByLabel('Username', { exact: true }).fill('auditor');
    await viewer.getByLabel('Password', { exact: true }).fill('auditor123');
    await viewer.getByRole('button', { name: 'Log in', exact: true }).click();
    await viewer.waitForURL('**/dashboard');
    for (const endpoint of ['/api/catalog/items', '/api/catalog/export']) {
      const response = await auditor.request.get(endpoint);
      expect(response.status()).toBe(403);
    }
    const operator = await admin.newPage();
    await login(operator);
    const crossOrigin = await admin.request.post('/api/catalog/items', { headers: { Origin: 'https://example.invalid' }, data: {} });
    expect(crossOrigin.status()).toBe(403);
    const malformed = await admin.request.post('/api/catalog/items', { headers: { 'Content-Type': 'application/json' }, data: '{' });
    expect(malformed.status()).toBe(400);
    const invalid: CatalogItemInput = { flow_id: 'QA', barrier_id: 'B', question_code: 'Q', question: 'Q', mitigation_id: '', barrier_statement: 'B', proposed_mitigation: '', adas_reference: 'ADA', cost: -1, unit: '' };
    const current = await status(admin.request);
    const negative = await admin.request.post('/api/catalog/items', { data: { operation_id: randomUUID(), base_version: current.active_version, expected_revision: current.revision, item: invalid } });
    expect(negative.status()).toBe(400);
    const unchanged = await status(admin.request);
    expect(unchanged.revision).toBe(current.revision);
  } finally {
    await anonymous.close(); await auditor.close(); await admin.close();
  }
});
