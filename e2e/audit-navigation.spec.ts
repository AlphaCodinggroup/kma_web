import { expect, test, type Page } from "@playwright/test";
import { login } from "./fixtures";

const savedPage = "/audits?status=draft_report_in_review&q=Fixture&page=5&size=25";
const audit = (id: string, project: string) => ({
  id, project_name: project, facility_name: "Fixture facility", flow_id: "fixture-flow",
  flow_name: "Fixture inspection", status: "draft_report_in_review", created_at: "2026-10-07T12:00:00Z",
});

async function installPages(page: Page, failFirstCursor = false) {
  const requests: URL[] = [];
  let failed = false;
  await page.route("**/api/audits?*", async route => {
    const url = new URL(route.request().url());
    requests.push(url);
    const next = url.searchParams.has("last_eval_id");
    if (next && failFirstCursor && !failed) {
      failed = true;
      await route.fulfill({ status: 503, json: { message: "Temporary saved-page outage" } });
      return;
    }
    await route.fulfill({ json: {
      audits: Array.from({ length: next ? 25 : 100 }, (_, i) => {
        const n = i + (next ? 100 : 0);
        return audit(`saved-${n}`, `Fixture project ${n}`);
      }), total: 125, ...(next ? {} : { last_eval_id: "saved-page-cursor" }),
    } });
  });
  return requests;
}

test("compact audit sorting preserves both directions and the original order", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 960 });
  await login(page);
  await page.route("**/api/audits?*", route => route.fulfill({ json: {
    audits: [audit("sort-m", "Mike fixture"), audit("sort-z", "Zeta fixture"), audit("sort-a", "Alpha fixture")], total: 3,
  } }));
  await page.goto("/audits");
  const rows = page.getByRole("list", { name: "Audit results" }).locator(":scope > li");
  await expect(rows).toHaveCount(3);
  await page.getByRole("combobox", { name: "Sort audits by" }).selectOption("project");
  await expect(rows.first()).toContainText("Alpha fixture");
  await page.getByRole("button", { name: "Sort descending", exact: true }).click();
  await expect(rows.first()).toContainText("Zeta fixture");
  await page.getByRole("combobox", { name: "Sort audits by" }).selectOption("");
  await expect(rows.first()).toContainText("Mike fixture");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test("saved audit page restores its cursor after reload and a return from review", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await login(page);
  const requests = await installPages(page);
  await page.goto(savedPage);
  const target = page.getByRole("row").filter({ hasText: "Fixture project 100" });
  await expect(target).toBeVisible();
  await expect(page.getByRole("searchbox")).toHaveValue("Fixture");
  await expect(page).toHaveURL(/page=5/);
  await page.reload();
  await expect(target).toBeVisible();
  await page.goto("/audits/audit-demo-003/edit");
  await page.goBack();
  await expect(target).toBeVisible();
  await expect(page).toHaveURL(/page=5/);
  const cursorRequests = requests.filter(url => url.searchParams.has("last_eval_id"));
  expect(cursorRequests.length).toBeGreaterThanOrEqual(2);
  expect(cursorRequests.every(url => url.searchParams.get("last_eval_id") === "saved-page-cursor" && url.searchParams.get("status") === "draft_report_in_review")).toBe(true);
});

test("saved audit page stops on a cursor error and recovers through explicit retry", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await login(page);
  const requests = await installPages(page, true);
  await page.goto(savedPage);
  await expect(page.getByRole("alert").filter({ hasText: "More audits could not be loaded" })).toBeVisible();
  await expect(page.getByRole("searchbox")).toHaveValue("Fixture");
  await expect(page).toHaveURL(/page=5/);
  await page.waitForLoadState("networkidle");
  expect(requests.filter(url => url.searchParams.has("last_eval_id"))).toHaveLength(1);
  await page.getByRole("button", { name: "Retry loading more", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "Fixture project 100" })).toBeVisible();
  expect(requests.filter(url => url.searchParams.has("last_eval_id"))).toHaveLength(2);
});

test("compact report sorting preserves both directions and the original order", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 960 });
  await login(page);
  await page.route("**/api/reports*", route => route.fulfill({ json: {
    reports: ["Mike fixture", "Zeta fixture", "Alpha fixture"].map((name, i) => ({
      id: `report-sort-${i}`, report_name: name, status: "completed", created_at: "2026-10-07T12:00:00Z",
      report_url: `http://localhost:3001/api/reports/report-sort-${i}/download`,
    })), count: 3,
  } }));
  await page.goto("/reports");
  const rows = page.getByRole("list", { name: "Report results" }).locator(":scope > li");
  await expect(rows).toHaveCount(3);
  await page.getByRole("combobox", { name: "Sort reports by" }).selectOption("project");
  await expect(rows.first()).toContainText("Alpha fixture");
  await page.getByRole("button", { name: "Sort descending", exact: true }).click();
  await expect(rows.first()).toContainText("Zeta fixture");
  await page.getByRole("combobox", { name: "Sort reports by" }).selectOption("");
  await expect(rows.first()).toContainText("Mike fixture");
  await expect(rows.first().getByRole("button", { name: "Download report", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
