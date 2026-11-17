import { expect, test } from "@playwright/test";
import { login } from "./fixtures";

test.use({ video: { mode: "on", size: { width: 1440, height: 960 } } });

test("pointer and press feedback respect reduced motion without hiding actions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await login(page);
  const refresh = page.getByRole("button", { name: "Refresh", exact: true });
  await expect(refresh).toBeEnabled();
  await refresh.hover();
  await expect.poll(() => refresh.evaluate(e => getComputedStyle(e).transform)).toBe("matrix(1, 0, 0, 1, 0, -1)");
  await page.mouse.down();
  await expect.poll(() => refresh.evaluate(e => getComputedStyle(e).transform)).toBe("matrix(0.98, 0, 0, 0.98, 0, 1)");
  await page.mouse.up();
  await expect(refresh).toBeEnabled();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await refresh.hover();
  await expect(refresh).toHaveCSS("transform", "none");
  const projects = page.getByRole("link", { name: "Projects", exact: true });
  await projects.hover();
  await expect(projects.locator("svg")).toHaveCSS("transform", "none");
  await projects.click();
  await expect(page).toHaveURL(/\/projects\?tab=projects$/);
  await page.getByRole("button", { name: "New Project", exact: true }).click();
  await expect(page.getByRole("dialog").locator(".kma-modal-panel")).toHaveCSS("animation-name", "none");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "New Project", exact: true })).toBeFocused();
});
