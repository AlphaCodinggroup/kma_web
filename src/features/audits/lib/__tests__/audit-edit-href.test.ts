/**
 * URL de la edición (QC) de una auditoría y destino de su botón "Back": sólo
 * se acepta volver al detalle de un proyecto, nunca a un destino arbitrario.
 */
import { describe, expect, it } from "vitest";
import {
  buildAuditEditHref,
  isAllowedReturnPath,
  resolveAuditBackHref,
} from "../audit-edit-href";

describe("isAllowedReturnPath", () => {
  it.each([
    "/projects/project-1",
    "/audits",
    "/audits?q=ramp&status=completed&auditor=jane",
    "/projects/a%2Fb",
    "/projects/project-1?status=completed&q=ramp",
  ])("accepts %s", (value) => {
    expect(isAllowedReturnPath(value)).toBe(true);
  });

  it.each([
    ["an external url", "https://evil.example.com"],
    ["a protocol relative url", "//evil.example.com"],
    ["the projects list", "/projects"],
    ["a nested path", "/projects/p-1/facilities"],
    ["a fragment", "/projects/p-1#top"],
    ["a query on the list", "/projects?status=completed"],
    ["a backslash trick", "/projects/\\evil.example.com"],
    ["an audit detail", "/audits/audit-1"],
    ["a backslash in the audits list", "/audits?x=\\evil.example.com"],
    ["an empty value", ""],
    ["a non string", 42],
    ["undefined", undefined],
  ])("rejects %s", (_label, value) => {
    expect(isAllowedReturnPath(value)).toBe(false);
  });
});

describe("buildAuditEditHref", () => {
  it("builds the bare edit url", () => {
    expect(buildAuditEditHref("audit-1")).toBe("/audits/audit-1/edit");
  });

  it("escapes the id and carries the auditor", () => {
    expect(buildAuditEditHref("audit/1", { auditor: "jane doe" })).toBe(
      "/audits/audit%2F1/edit?auditor=jane%20doe"
    );
  });

  it.each([null, "", "   "])("omits a blank auditor (%j)", (auditor) => {
    expect(buildAuditEditHref("audit-1", { auditor })).toBe("/audits/audit-1/edit");
  });

  it("appends an allowed return path after the auditor", () => {
    expect(
      buildAuditEditHref("audit-1", {
        auditor: "jane",
        returnTo: "/projects/project-1",
      })
    ).toBe("/audits/audit-1/edit?auditor=jane&returnTo=%2Fprojects%2Fproject-1");
  });

  it("drops a return path that is not allowed", () => {
    expect(
      buildAuditEditHref("audit-1", { returnTo: "https://evil.example.com" })
    ).toBe("/audits/audit-1/edit");
  });
});

describe("resolveAuditBackHref", () => {
  it("returns to the audit list with its search and status intact", () => {
    expect(resolveAuditBackHref("/audits?q=ramp&status=completed")).toBe("/audits?q=ramp&status=completed");
  });
  it("returns to the source project", () => {
    expect(resolveAuditBackHref("/projects/project-1")).toBe("/projects/project-1");
  });

  it("returns to the source project with its filters", () => {
    expect(resolveAuditBackHref("/projects/p-1?status=completed")).toBe(
      "/projects/p-1?status=completed"
    );
  });

  it.each([undefined, "", "//evil.example.com", "/users"])(
    "falls back to the audits list for %j",
    (value) => {
      expect(resolveAuditBackHref(value)).toBe("/audits");
    }
  );
});
