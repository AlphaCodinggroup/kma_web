export const READ_ROLES = ["viewer", "auditor", "admin", "administrator"] as const;
export const CAPTURE_ROLES = ["auditor", "admin", "administrator"] as const;
export const ADMIN_ROLES = ["admin", "administrator"] as const;

type Rule = { method: string; path: RegExp; roles: readonly string[] };

const rules: Rule[] = [
  { method: "GET", path: /^\/api\/dashboard$/, roles: READ_ROLES },
  { method: "GET", path: /^\/api\/audits$/, roles: READ_ROLES },
  { method: "GET", path: /^\/api\/audits\/audit-reviews\/[^/]+$/, roles: READ_ROLES },
  { method: "GET", path: /^\/api\/audits\/[^/]+$/, roles: READ_ROLES },
  { method: "DELETE", path: /^\/api\/audits\/[^/]+$/, roles: ADMIN_ROLES },
  { method: "POST", path: /^\/api\/audits\/[^/]+\/send-for-review$/, roles: CAPTURE_ROLES },
  { method: "GET", path: /^\/api\/audits-review\/[^/]+$/, roles: READ_ROLES },
  { method: "POST", path: /^\/api\/audits-review\/[^/]+\/(reviews|complete-review|reopen)$/, roles: ADMIN_ROLES },
  { method: "PATCH", path: /^\/api\/audits-review\/[^/]+\/status$/, roles: ADMIN_ROLES },
  { method: "PATCH", path: /^\/api\/audits-review\/[^/]+\/findings\/[^/]+$/, roles: ADMIN_ROLES },
  { method: "PUT", path: /^\/api\/audits-review\/[^/]+\/answers$/, roles: ADMIN_ROLES },
  { method: "GET", path: /^\/api\/(projects|facilities|flows|reports)$/, roles: READ_ROLES },
  { method: "GET", path: /^\/api\/flows\/summary$/, roles: READ_ROLES },
  { method: "GET", path: /^\/api\/(projects|facilities|flows|reports)\/[^/]+$/, roles: READ_ROLES },
  { method: "POST", path: /^\/api\/(projects|facilities|flows)$/, roles: ADMIN_ROLES },
  { method: "PATCH", path: /^\/api\/projects\/[^/]+$/, roles: ADMIN_ROLES },
  { method: "PUT", path: /^\/api\/(facilities|flows)\/[^/]+$/, roles: ADMIN_ROLES },
  { method: "DELETE", path: /^\/api\/(projects|facilities|flows|reports)\/[^/]+$/, roles: ADMIN_ROLES },
  { method: "POST", path: /^\/api\/(projects|facilities)\/[^/]+\/(archive|restore)$/, roles: ADMIN_ROLES },
  { method: "POST", path: /^\/api\/reports\/[^/]+\/restore$/, roles: ADMIN_ROLES },
  { method: "GET", path: /^\/api\/report-jobs\/[^/]+$/, roles: READ_ROLES },
  { method: "POST", path: /^\/api\/report-jobs\/[^/]+\/retry$/, roles: ADMIN_ROLES },
  { method: "GET", path: /^\/api\/users$/, roles: ADMIN_ROLES },
  { method: "POST", path: /^\/api\/users$/, roles: ADMIN_ROLES },
  { method: "PATCH", path: /^\/api\/users\/[^/]+$/, roles: ADMIN_ROLES },
  { method: "DELETE", path: /^\/api\/users\/[^/]+$/, roles: ADMIN_ROLES },
  { method: "GET", path: /^\/api\/comments$/, roles: READ_ROLES },
  { method: "POST", path: /^\/api\/comments$/, roles: CAPTURE_ROLES },
  { method: "PUT", path: /^\/api\/comments\/[^/]+$/, roles: CAPTURE_ROLES },
  { method: "POST", path: /^\/api\/facilities\/upload-img$/, roles: ADMIN_ROLES },
  { method: "POST", path: /^\/api\/uploads(\/presigned)?$/, roles: CAPTURE_ROLES },
  { method: "PUT", path: /^\/api\/uploads\/proxy$/, roles: CAPTURE_ROLES },
];

export function explicitApiRouteRoles(method: string, pathname: string): readonly string[] | undefined {
  return rules.find((rule) => rule.method === method.toUpperCase() && rule.path.test(pathname))?.roles;
}

export function apiRouteRoles(method: string, pathname: string): readonly string[] | null {
  if (pathname === "/api/session" || pathname === "/api/session/refresh") return null;
  return explicitApiRouteRoles(method, pathname) ?? READ_ROLES;
}

export function groupCanAccess(groups: readonly string[], allowed: readonly string[]): boolean {
  const normalized = new Set(groups.map((group) => group.trim().toLowerCase()));
  return allowed.some((role) => normalized.has(role));
}
