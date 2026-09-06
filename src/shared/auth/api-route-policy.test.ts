import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { ADMIN_ROLES, apiRouteRoles, explicitApiRouteRoles, groupCanAccess } from "./api-route-policy";

describe("apiRouteRoles", () => {
  it("maps every BFF method/path combination", () => {
    const root = join(process.cwd(), "app", "api");
    const files = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? files(join(directory, entry.name)) : entry.name === "route.ts" ? [join(directory, entry.name)] : []
    );
    const discovered = files(root).flatMap((file) => {
      const pathname = "/api/" + relative(root, file).split(sep).slice(0, -1)
        .map((segment) => segment.startsWith("[") ? "sample" : segment).join("/");
      return [...readFileSync(file, "utf8").matchAll(/^export (?:async )?function (GET|POST|PUT|PATCH|DELETE)/gm)]
        .map((match) => [match[1], pathname] as const);
    });
    expect(discovered).toHaveLength(51);
    const protectedDiscovered = discovered.filter(([, path]) => path !== "/api/session" && path !== "/api/session/refresh");
    expect(protectedDiscovered).toHaveLength(48);
    for (const [method, path] of protectedDiscovered) {
      const roles = explicitApiRouteRoles(method, path);
      expect(roles, `${method} ${path} must have an explicit policy`).toBeDefined();
      expect(roles?.length, `${method} ${path}`).toBeGreaterThan(0);
    }
  });

  it("keeps session endpoints public and defaults unknown API URLs to authenticated reads", () => {
    expect(apiRouteRoles("POST", "/api/session")).toBeNull();
    expect(apiRouteRoles("POST", "/api/session/refresh")).toBeNull();
    expect(apiRouteRoles("GET", "/api/not-found")).not.toBeNull();
  });

  it("evaluates groups case-insensitively", () => {
    expect(groupCanAccess([" Administrator "], ADMIN_ROLES)).toBe(true);
    expect(groupCanAccess(["viewer"], ADMIN_ROLES)).toBe(false);
  });

  it.each([
    ["GET", "/api/audits", "viewer", true],
    ["POST", "/api/comments", "viewer", false],
    ["POST", "/api/comments", "auditor", true],
    ["POST", "/api/audits/a-1/send-for-review", "auditor", true],
    ["POST", "/api/audits-review/a-1/complete-review", "auditor", false],
    ["POST", "/api/audits-review/a-1/complete-review", "admin", true],
    ["DELETE", "/api/reports/job-1", "viewer", false],
    ["DELETE", "/api/reports/job-1", "administrator", true],
  ])("applies %s %s to %s", (method, path, group, expected) => {
    const allowed = apiRouteRoles(method, path);
    expect(allowed).not.toBeNull();
    expect(groupCanAccess([group], allowed ?? [])).toBe(expected);
  });
});
