import { expect, test, type Page } from "@playwright/test";

const username = process.env.E2E_USERNAME ?? "admin@example.test";
const password = process.env.E2E_PASSWORD ?? "LocalAdmin123!";

async function login(page: Page) {
  await page.goto("/login");
  const usernameInput = page.getByLabel("Username");
  const passwordInput = page.getByLabel("Password");
  await expect(usernameInput).toBeVisible();
  await page.waitForFunction(() => {
    const input = document.getElementById("username");
    return !!input && Object.keys(input).some((key) => key.startsWith("__reactProps$"));
  });
  await usernameInput.fill(username);
  await passwordInput.fill(password);
  await expect(usernameInput).toHaveValue(username);
  await expect(passwordInput).toHaveValue(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test("loads every application URL without server or browser errors", async ({ page }) => {
  await login(page);
  const consoleErrors: string[] = [];
  const serverErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      serverErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  const routes = [
    ["/", /\/dashboard$/],
    ["/dashboard", /\/dashboard$/],
    ["/projects", /\/projects$/],
    ["/audits", /\/audits$/],
    ["/reports", /\/reports$/],
    ["/flows", /\/flows$/],
    ["/flows/new", /\/flows\/new$/],
    ["/flows/flow-local-demo", /\/flows\/flow-local-demo$/],
    ["/users", /\/users$/],
    [
      "/audits/report-state-complete-review/edit",
      /\/audits\/report-state-complete-review\/edit$/,
    ],
  ] as const;

  for (const [path, expectedURL] of routes) {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.status(), path).toBeLessThan(400);
    await expect(page, path).toHaveURL(expectedURL);
    await expect(page.locator("body"), path).not.toContainText("Application error");
  }

  expect(serverErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("expires the browser session explicitly", async ({ context, page }) => {
  await login(page);
  await context.clearCookies();
  await page.goto("/reports");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});

test("archives, restores and exposes a blocked-popup download", async ({ browserName, page }) => {
  test.skip(browserName !== "chromium", "One isolated mutation is sufficient; navigation runs in all engines.");
  await login(page);
  await page.goto("/reports");
  const row = page
    .getByRole("row")
    .filter({ hasText: "report-state-complete-review" })
    .first();
  await expect(row).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "Archive report version" }).click();
  await expect(row.getByRole("button", { name: "Restore report version" })).toBeVisible();
  await row.getByRole("button", { name: "Restore report version" }).click();
  await expect(row.getByRole("button", { name: "Archive report version" })).toBeVisible();

  await page.evaluate(() => {
    window.open = () => null;
  });
  await row.getByRole("button", { name: "Download report" }).click();
  await expect(page.getByRole("link", { name: "Open download" })).toBeVisible();
});
