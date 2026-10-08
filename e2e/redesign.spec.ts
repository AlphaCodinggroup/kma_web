import { expect, test } from "@playwright/test";
import { login, collectErrors } from "./fixtures";

const SCREENS = [
  ["dashboard", "/dashboard"],
  ["projects", "/projects?tab=projects"],
  ["facilities", "/projects?tab=facilities"],
  ["project-detail", "/projects/proj-local-001"],
  ["audits", "/audits"],
  ["review", "/audits/audit-demo-003/edit"],
  ["reports", "/reports"],
  ["flows", "/flows"],
  ["flow-editor", "/flows/flow-local-curb-ramps"],
  ["users", "/users"],
] as const;

test("appearance persists on login and follows the system with reduced motion", async ({ page }) => {
  await page.goto("/login");
  const appearance = page.getByRole("combobox", { name: "Appearance" });
  await appearance.selectOption("dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(appearance).toHaveValue("dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await appearance.selectOption("system");
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveClass(/light/);
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(await appearance.evaluate(el => getComputedStyle(el).transitionDuration)).toBe("1e-05s");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("mobile navigation traps focus, closes on Escape and opens Facilities", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const opener = page.getByRole("button", { name: "Open navigation" });
  await opener.click();
  const menu = page.getByRole("dialog", { name: "Navigation" });
  await expect(menu).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  expect(await menu.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.click();
  await menu.getByRole("link", { name: "Facilities", exact: true }).click();
  await expect(page).toHaveURL(/tab=facilities/);
  await expect(menu).toBeHidden();
  await expect(page.getByRole("tab", { name: "Facilities", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.reload();
  await expect(page.getByRole("tab", { name: "Facilities", exact: true })).toHaveAttribute("aria-selected", "true");
});

test("audit filters and search survive refresh and a visit to another screen", async ({ page }) => {
  await login(page);
  await page.goto("/audits?status=draft_report_in_review&q=Boston");
  await expect(page.getByRole("searchbox").first()).toHaveValue("Boston");
  await expect(page.getByRole("row").filter({ hasText: "Boston Apartment Complex" }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole("searchbox").first()).toHaveValue("Boston");
  await page.goto("/dashboard");
  await page.goBack();
  await expect(page.getByRole("searchbox").first()).toHaveValue("Boston");
  await expect(page).toHaveURL(/status=draft_report_in_review/);
});

test("clicking the blank dialog backdrop closes the form and restores focus", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await login(page);
  await page.goto("/projects?tab=facilities");
  const opener = page.getByRole("button", { name: "New Facility", exact: true });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Create New Facility" });
  await expect(dialog).toBeVisible();
  await page.mouse.click(20, 90);
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("tabs and cached navigation keep page context and sidebar synchronized", async ({ page }) => {
  await login(page);
  await page.goto("/projects?tab=projects");
  const projects = page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Projects", exact: true });
  const facilities = page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Facilities", exact: true });
  await page.getByRole("tab", { name: "Facilities", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Facilities");
  await expect(facilities).toHaveAttribute("aria-current", "page");
  await expect(projects).not.toHaveAttribute("aria-current", "page");
  await projects.click();
  await expect(page.getByRole("tab", { name: "Projects", exact: true })).toHaveAttribute("aria-selected", "true");
  await facilities.click();
  await expect(page.getByRole("tab", { name: "Facilities", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(facilities).toHaveAttribute("aria-current", "page");
});

test("cursor loading retains filters and keeps partial results after an error", async ({ page }) => {
  await login(page);
  const requests: URL[] = [];
  let failNextPage = true;
  await page.route("**/api/audits?*", async route => {
    const url = new URL(route.request().url());
    requests.push(url);
    if (url.searchParams.has("last_eval_id") && failNextPage) {
      failNextPage = false;
      await route.fulfill({ status: 503, json: { message: "Temporary test outage" } });
      return;
    }
    const audit = (id: string, project: string) => ({ id, flow_id: "fixture-flow", flow_name: "Fixture inspection", status: "draft_report_in_review", created_at: "2026-10-07T12:00:00Z", project_name: project, facility_name: "Fixture facility" });
    const next = url.searchParams.has("last_eval_id");
    await route.fulfill({ json: { audits: next ? [audit("cursor-last", "Cursor second page")] : Array.from({ length: 100 }, (_, i) => audit(`cursor-${i}`, `First page ${i}`)), total: 101, ...(next ? {} : { last_eval_id: "browser-cursor" }) } });
  });
  await page.goto("/audits?status=draft_report_in_review&q=Cursor+second");
  await expect(page.getByText("Search applies to loaded audits; load more to search additional results.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Load more audits" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "More audits could not be loaded" })).toBeVisible();
  await expect(page.getByRole("searchbox")).toHaveValue("Cursor second");
  await page.getByRole("button", { name: "Retry loading more" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Cursor second page" })).toBeVisible();
  await expect(page.getByText("All available results loaded.", { exact: false })).toBeVisible();
  const nextRequests = requests.filter(url => url.searchParams.has("last_eval_id"));
  expect(nextRequests).toHaveLength(2);
  expect(nextRequests.every(url => url.searchParams.get("last_eval_id") === "browser-cursor" && url.searchParams.get("status") === "draft_report_in_review")).toBe(true);
});

test("deleting a report refreshes the rendered list immediately", async ({ page }) => {
  await login(page);
  let deleted = false;
  let listRequests = 0;
  await page.route("**/api/reports**", async route => {
    if (route.request().method() === "DELETE") {
      deleted = true;
      await route.fulfill({ status: 204 });
    } else {
      listRequests++;
      await route.fulfill({ json: { reports: deleted ? [] : [{ id: "browser-deletion", report_name: "Browser deletion report", status: "completed", created_at: "2026-10-07T12:00:00Z" }], count: deleted ? 0 : 1 } });
    }
  });
  await page.goto("/reports");
  const row = page.getByRole("row").filter({ hasText: "Browser deletion report" });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Delete report", exact: true }).click();
  await page.getByRole("dialog", { name: "Delete report?", exact: true }).getByRole("button", { name: "Delete report", exact: true }).click();
  await expect(row).toBeHidden();
  await expect(page.getByRole("status").filter({ hasText: "Report deleted." })).toBeVisible();
  expect(deleted).toBe(true);
  expect(listRequests).toBeGreaterThanOrEqual(2);
});

for (const width of [390, 768, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`all screens at ${width}px in ${theme} appearance`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 960 });
      const { consoleErrors, serverErrors } = collectErrors(page);
      await page.goto("/login");
      await page.getByRole("combobox", { name: "Appearance" }).selectOption(theme);
      await page.waitForLoadState("networkidle");
      await settleVisualAssets(page);
      await expect(page.locator("html")).toHaveClass(new RegExp(theme));
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({ path: testInfo.outputPath(`login-${theme}-${width}.png`), fullPage: true });
      await login(page);
      await page.getByRole("combobox", { name: "Appearance" }).selectOption(theme);
      for (const [name, route] of SCREENS) {
        await page.goto(route);
        await page.waitForLoadState("networkidle");
        await settleVisualAssets(page);
        await expect(page.getByRole("heading", { level: 1 }).first(), route).toBeVisible();
        await expect(page.locator("html")).toHaveClass(new RegExp(theme));
        const dimensions = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
        expect(dimensions.content, `${route} must scroll tables within their container`).toBeLessThanOrEqual(dimensions.width);
        await page.screenshot({ path: testInfo.outputPath(`${name}-${theme}-${width}.png`), fullPage: true });
      }
      expect(serverErrors).toEqual([]);
      expect(consoleErrors.filter(error => !/favicon|React DevTools/i.test(error))).toEqual([]);
    });
  }
}

test("secondary review actions keep readable colors in both appearances", async ({ page }) => {
  await login(page);
  for (const appearance of ["dark", "light"]) {
    await page.goto("/dashboard");
    await page.getByRole("combobox", { name: "Appearance" }).selectOption(appearance);
    await page.goto("/audits/audit-demo-003/edit?view=report");
    await page.getByRole("button", { name: "Comments on finding 1" }).click();
    for (const action of [
      page.getByRole("button", { name: "Cancel", exact: true }),
      page.getByRole("button", { name: "Close comments panel" }),
    ]) {
      await expect(action).toBeVisible();
      const contrast = await action.evaluate(element => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const context = canvas.getContext("2d", { willReadFrequently: true })!;
        const ancestors: Element[] = [];
        for (let node: Element | null = element; node; node = node.parentElement) ancestors.unshift(node);
        context.fillStyle = "white";
        context.fillRect(0, 0, 1, 1);
        for (const ancestor of ancestors) {
          context.fillStyle = getComputedStyle(ancestor).backgroundColor;
          context.fillRect(0, 0, 1, 1);
        }
        const luminance = (pixels: Uint8ClampedArray) => {
          const channels = [...pixels].slice(0, 3).map(value => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          });
          return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
        };
        const background = luminance(context.getImageData(0, 0, 1, 1).data);
        context.fillStyle = getComputedStyle(element).color;
        context.fillRect(0, 0, 1, 1);
        const foreground = luminance(context.getImageData(0, 0, 1, 1).data);
        return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
      });
      expect(contrast, `${appearance} review action contrast`).toBeGreaterThanOrEqual(4.5);
    }
    await page.getByRole("button", { name: "Close comments panel" }).click();
  }
});

async function settleVisualAssets(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.allSettled([...document.images].map(image => image.decode()));
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}
