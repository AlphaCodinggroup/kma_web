import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { login } from "./fixtures";

const FLOW_ID = "flow-local-curb-ramps";
const EDITOR_ROUTE = `/flows/${FLOW_ID}`;
const DRAFT_KEY = `flow-editor-draft-${FLOW_ID}`;

async function openEditor(page: Page) {
  await login(page);
  await page.goto(EDITOR_ROUTE);
  await expect(page.getByRole("textbox", { name: "Flow title", exact: true })).toBeVisible();
}

async function readSeed(page: Page) {
  const response = await page.request.get(`/api/flows/${FLOW_ID}`);
  expect(response.ok()).toBe(true);
  return response.json();
}

test("mobile steps select the inspector and export a real JSON download", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openEditor(page);
  const seed = await readSeed(page);
  const browse = page.getByRole("button", { name: "Browse steps", exact: true });
  await browse.click();
  const steps = page.getByRole("dialog", { name: "Flow steps", exact: true });
  await expect(steps).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  expect(await steps.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(steps).toBeHidden();
  await expect(browse).toBeFocused();
  await browse.click();
  const stepId = seed.steps.find((step: { type: string }) => step.type === "Question").id;
  await steps.getByRole("button", { name: `Select step ${stepId}`, exact: true }).click();
  await expect(steps).toBeHidden();
  await expect(page.getByRole("heading", { name: stepId.trim(), exact: true })).toBeVisible();
  await expect(page.getByPlaceholder("Enter question text")).toBeVisible();

  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  const filePath = await download.path();
  expect(filePath).not.toBeNull();
  const exported = JSON.parse(await readFile(filePath!, "utf8"));
  expect(exported.id).toBe(FLOW_ID);
  expect(exported.title).toBe(await page.getByRole("textbox", { name: "Flow title", exact: true }).inputValue());
  expect(exported.steps.length).toBeGreaterThan(0);
  expect(exported.steps.some((step: { id: string }) => step.id === stepId.trim())).toBe(true);
  expect(await readSeed(page)).toEqual(seed);
});

test("unsaved flow edits block navigation and recover after reload without changing the seed", async ({ page }) => {
  await openEditor(page);
  const seed = await readSeed(page);
  const title = page.getByRole("textbox", { name: "Flow title", exact: true });
  const originalTitle = await title.inputValue();
  const editedTitle = `${originalTitle} — local recovery`;
  await title.fill(editedTitle);
  await expect(page.getByText("Unsaved changes", { exact: true })).toBeVisible();

  const pendingDialog = page.waitForEvent("dialog");
  const attemptedNavigation = page.goto("/flows").catch(error => error);
  const confirmation = await pendingDialog;
  expect(confirmation.type()).toBe("beforeunload");
  await confirmation.dismiss();
  const navigationResult = await attemptedNavigation;
  if (navigationResult instanceof Error) expect(navigationResult.message).toMatch(/ERR_ABORTED|canceled/i);
  await expect(page).toHaveURL(new RegExp(`${EDITOR_ROUTE}$`));
  await expect(title).toHaveValue(editedTitle);

  await expect.poll(() => page.evaluate(key => {
    const draft = localStorage.getItem(key);
    return draft ? JSON.parse(draft).flow.title : null;
  }, DRAFT_KEY), { timeout: 20_000 }).toBe(editedTitle);

  page.once("dialog", async dialog => {
    expect(dialog.type()).toBe("beforeunload");
    await dialog.accept();
  });
  await page.reload();
  const recovery = page.getByRole("dialog", { name: "Draft found", exact: true });
  await expect(recovery).toBeVisible();
  await recovery.getByRole("button", { name: "Recover draft", exact: true }).click();
  await expect(recovery).toBeHidden();
  await expect(title).toHaveValue(editedTitle);
  await expect(page.getByText("Unsaved changes", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Discard", exact: true }).click();
  const discard = page.getByRole("dialog", { name: "Discard changes?", exact: true });
  await discard.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(title).toHaveValue(editedTitle);
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await page.getByRole("dialog", { name: "Discard changes?", exact: true }).getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(title).toHaveValue(originalTitle);
  await expect(page.getByText("Unsaved changes", { exact: true })).toBeHidden();
  expect(await page.evaluate(key => localStorage.getItem(key), DRAFT_KEY)).toBeNull();
  expect(await readSeed(page)).toEqual(seed);
});

test("uploads a reference image, saves and exports an isolated flow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const seed = await readSeed(page);
  const fixtureId = `e2e-images-${randomUUID()}`;
  const fixtureTitle = `Image upload ${fixtureId}`;
  const created = await page.request.post("/api/flows", { data: { ...seed, id: fixtureId, code: fixtureId, title: fixtureTitle, flow_type: "Ramps", version: 1 } });
  expect(created.ok(), `Create isolated flow (${created.status()}): ${await created.text()}`).toBe(true);
  const fixture = await created.json();
  expect(fixture.id).not.toBe(FLOW_ID);
  expect(typeof fixture.id).toBe("string");
  try {
    await page.goto(`/flows/${fixture.id}`);
    await expect(page.getByRole("textbox", { name: "Flow title", exact: true })).toHaveValue(fixtureTitle);
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Add Image", exact: true }).click();
    const png = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 2;
      canvas.height = 2;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#0B7078";
      context.fillRect(0, 0, 2, 2);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    await (await chooser).setFiles({ name: "reference.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
    const preview = page.getByRole("img", { name: /^Ref \d+$/ }).last();
    await expect(preview).toHaveAttribute("src", /^blob:/);
    await expect.poll(() => preview.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(2);

    const presigned = page.waitForResponse(response => response.url().includes("/api/uploads/presigned") && response.request().method() === "POST");
    const uploaded = page.waitForResponse(response => response.url().includes("/api/uploads/proxy") && response.request().method() === "PUT");
    const saved = page.waitForResponse(response => response.url().endsWith(`/api/flows/${fixture.id}`) && response.request().method() === "PUT");
    await page.getByRole("button", { name: "Save Flow", exact: true }).click();
    const responses = await Promise.all([presigned, uploaded, saved]);
    for (const response of responses) expect(response.ok(), response.url()).toBe(true);
    await expect(page.getByRole("dialog", { name: "Flow Saved", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page).toHaveURL(/\/flows$/);
    await page.goto(`/flows/${fixture.id}`);
    const persisted = page.getByRole("img", { name: /^Ref \d+$/ }).last();
    await expect(persisted).toHaveAttribute("src", /^https?:/);
    await expect.poll(() => persisted.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(2);

    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export", exact: true }).click();
    const download = await downloaded;
    const filePath = await download.path();
    expect(filePath).not.toBeNull();
    const exported = JSON.parse(await readFile(filePath!, "utf8"));
    expect(exported.title).toBe(fixtureTitle);
    expect(exported.steps.some((step: { images?: string[] }) => step.images?.some(url => /^https?:/.test(url)))).toBe(true);
  } finally {
    const deleted = await page.request.delete(`/api/flows/${fixture.id}`);
    expect(deleted.ok()).toBe(true);
  }
  expect(await readSeed(page)).toEqual(seed);
});
