import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";
import { expect, test, type Locator } from "@playwright/test";
import { login } from "./fixtures";

const SCREENS = [
  ["dashboard", "/dashboard"], ["projects", "/projects?tab=projects"],
  ["facilities", "/projects?tab=facilities"], ["project-detail", "/projects/proj-local-001"],
  ["audits", "/audits"], ["review", "/audits/audit-demo-003/edit"],
  ["reports", "/reports"], ["flows", "/flows"],
  ["flow-editor", "/flows/flow-local-curb-ramps"], ["users", "/users"],
] as const;

async function expectWithinViewport(control: Locator, width: number) {
  await expect(control).toBeVisible();
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

for (const width of [390, 768]) {
  test(`list actions and form fields stay usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await login(page);
    for (const [route, action] of [
      ["/projects?tab=projects", "Edit project"], ["/projects?tab=facilities", "Edit facility"],
      ["/audits", "Review audit"], ["/reports", "Delete report"], ["/users", "Edit user"],
    ]) {
      await page.goto(route);
      const control = page.getByRole("button", { name: action, exact: true }).first();
      await expectWithinViewport(control, width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    await page.goto("/audits/audit-demo-003/edit");
    await expectWithinViewport(page.getByTestId("audit-back-link"), width);
    await page.goto("/projects?tab=projects");
    const opener = page.getByRole("button", { name: "New Project", exact: true });
    await opener.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const firstField = dialog.getByRole("textbox").first();
    await expect(firstField).toHaveCSS("font-size", "16px");
    await expectWithinViewport(firstField, width);
    if (width === 390) expect(await firstField.evaluate(el => el === document.activeElement)).toBe(false);
    await page.keyboard.press("Escape");
    await expect(opener).toBeFocused();
    await page.goto("/projects/proj-local-001");
    const name = page.getByRole("button", { name: /^Main Office/ }).getByText("Main Office", { exact: true });
    await expect(name).toBeVisible();
    expect((await name.boundingBox())!.height).toBeLessThanOrEqual(28);
  });
}

test("fieldwork and unknown audit states never enter the review queue", async ({ page }) => {
  await login(page);
  await page.route("**/api/audits?*", route => route.fulfill({ json: {
    audits: ["audit_in_progress", "deleted", "future_state"].map((status, i) => ({
      id: `safe-state-${i}`, status, flow_id: "fixture", flow_name: "Status fixture",
      project_name: `Fixture ${status}`, facility_name: "Fixture facility", created_at: "2026-10-07T12:00:00Z",
    })), total: 3,
  } }));
  await page.goto("/audits");
  for (const label of ["Fieldwork in progress", "Deleted", "Status unavailable"]) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
  const review = page.getByRole("button", { name: "Review audit", exact: true });
  await expect(review).toHaveCount(3);
  for (const button of await review.all()) await expect(button).toBeDisabled();
});

test("flow title and step drawer keep their proportions across breakpoints", async ({ page }) => {
  await login(page);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/flows/flow-local-curb-ramps");
    const title = page.getByRole("textbox", { name: "Flow title", exact: true });
    await expect(title).toBeVisible();
    expect((await title.boundingBox())!.width).toBeGreaterThanOrEqual(width < 400 ? width - 100 : 300);
    const browse = page.getByRole("button", { name: "Browse steps", exact: true });
    if (width < 1280) {
      await browse.click();
      const panel = page.getByRole("dialog", { name: "Flow steps", exact: true });
      const box = await panel.locator(".kma-modal-panel").boundingBox();
      expect(box!.x).toBe(0);
      expect(box!.height).toBe(960);
      expect(box!.width).toBeLessThanOrEqual(Math.min(width, 384));
      const deleteStep = panel.getByRole("button", { name: /^Delete step / }).first();
      await expect(deleteStep).toBeVisible();
      const deleteBox = await deleteStep.boundingBox();
      expect(deleteBox!.width).toBeGreaterThanOrEqual(width < 1024 ? 44 : 40);
      expect(deleteBox!.height).toBeGreaterThanOrEqual(width < 1024 ? 44 : 40);
      await page.keyboard.press("Escape");
      await expect(browse).toBeFocused();
    } else {
      await expect(browse).toBeHidden();
      await expect(page.getByRole("table", { name: "Flow step sequence" })).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test("all screens reflow at 320px and the CSS viewport of 200 percent zoom", async ({ page }) => {
  await login(page);
  for (const width of [320, 720]) {
    await page.setViewportSize({ width, height: 960 });
    for (const [, route] of SCREENS) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth), route).toBeLessThanOrEqual(width);
    }
  }
});

for (const theme of ["light", "dark"]) {
  test(`automated accessibility of all screens in ${theme}`, async ({ page }, testInfo) => {
    const reports: { screen: string; width: number; violations: unknown[] }[] = [];
    await page.goto("/login");
    await page.getByRole("combobox", { name: "Appearance" }).selectOption(theme);
    const scan = async (screen: string, width: number) => {
      await page.waitForLoadState("networkidle");
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      reports.push({ screen, width, violations: result.violations });
    };
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      await scan("login", width);
    }
    await login(page);
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      for (const [name, route] of SCREENS) {
        await page.goto(route);
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
        await scan(name, width);
      }
    }
    const reportPath = testInfo.outputPath(`accessibility-${theme}.json`);
    await writeFile(reportPath, JSON.stringify(reports, null, 2));
    await testInfo.attach(`accessibility-${theme}`, { path: reportPath, contentType: "application/json" });
    expect(reports.filter(report => report.violations.length)).toEqual([]);
  });
}

test("mobile review queue keeps two complete activity entries in the first viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 960 });
  await login(page);
  for (const appearance of ["light", "dark"]) {
    await page.getByRole("combobox", { name: "Appearance" }).selectOption(appearance);
    const pipeline = page.getByRole("region", { name: "Review pipeline" });
    await expect(pipeline.getByRole("link")).toHaveCount(3);
    const entries = page.getByRole("list", { name: "Recent audit activity" }).locator(":scope > li");
    await expect(entries.nth(1)).toBeVisible();
    const second = await entries.nth(1).boundingBox();
    expect(second!.y + second!.height).toBeLessThanOrEqual(960);
  }
});

test("navigation and work panels follow the selected appearance on desktop and mobile", async ({ page }) => {
  await login(page);
  const checkPanels = async (appearance: string) => {
    const panels = page.locator(".kma-theme-panel:visible");
    expect(await panels.count()).toBeGreaterThan(0);
    for (const panel of await panels.all()) {
      const style = await panel.evaluate(element => {
        const computed = getComputedStyle(element);
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const context = canvas.getContext("2d")!;
        context.fillStyle = computed.backgroundColor;
        context.fillRect(0, 0, 1, 1);
        const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
        return { scheme: computed.colorScheme, brightness: (r + g + b) / 3 };
      });
      expect(style.scheme).toBe(appearance);
      if (appearance === "light") expect(style.brightness).toBeGreaterThan(240);
      else expect(style.brightness).toBeLessThan(80);
    }
  };
  for (const appearance of ["light", "dark"]) {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.getByRole("combobox", { name: "Appearance" }).selectOption(appearance);
    for (const route of ["/dashboard", "/projects", "/flows/flow-local-curb-ramps"]) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await checkPanels(appearance);
    }
    await page.setViewportSize({ width: 390, height: 960 });
    await page.goto("/projects");
    await page.getByRole("button", { name: "Open navigation", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Navigation", exact: true })).toBeVisible();
    await checkPanels(appearance);
    await page.keyboard.press("Escape");
  }
});

