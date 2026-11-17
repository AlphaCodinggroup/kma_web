import { describe, expect, it } from "vitest";
import { canReviewAudit } from "../audit-permissions";

describe("audit review ownership", () => {
 it.each([
  ["owner", false, "auditor", "owner", "owner", true],
  ["other auditor", false, "auditor", "other", "owner", false],
  ["no owner", false, "auditor", "owner", null, false],
  ["no identity", false, "auditor", "", "", false],
  ["viewer owner", false, "viewer", "owner", "owner", false],
  ["admin", true, "admin", "admin", null, true],
  ["administrator", true, "administrator", "admin", null, true],
 ] as const)("%s", (_name, admin, role, id, owner, allowed) => {
  expect(canReviewAudit(admin, {id, role}, owner)).toBe(allowed);
 });
 it("fails closed without a user",()=>expect(canReviewAudit(false, null, "owner")).toBe(false));
});
