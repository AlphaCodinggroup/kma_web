import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ cookies: vi.fn(), serverEnv: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@shared/config/env", () => ({
  serverEnv: mocks.serverEnv,
  PublicEnv: { apiBaseUrl: "http://backend.test" },
}));

import * as auditReviewAnswers from "./audits-review/[auditId]/answers/route";
import * as auditCompleteReview from "./audits-review/[auditId]/complete-review/route";
import * as auditFinding from "./audits-review/[auditId]/findings/[questionCode]/route";
import * as auditReopen from "./audits-review/[auditId]/reopen/route";
import * as auditOpenReview from "./audits-review/[auditId]/reviews/route";
import * as auditStatus from "./audits-review/[auditId]/status/route";
import * as auditDetail from "./audits/[auditId]/route";
import * as auditSendForReview from "./audits/[auditId]/send-for-review/route";
import * as auditReviewDetail from "./audits/audit-reviews/[auditReviewId]/route";
import * as audits from "./audits/route";
import * as commentDetail from "./comments/[commentId]/route";
import * as comments from "./comments/route";
import * as dashboard from "./dashboard/route";
import * as facilityArchive from "./facilities/[id]/archive/route";
import * as facilityRestore from "./facilities/[id]/restore/route";
import * as facilityDetail from "./facilities/[id]/route";
import * as facilities from "./facilities/route";
import * as facilityUpload from "./facilities/upload-img/route";
import * as flowDetail from "./flows/[id]/route";
import * as flows from "./flows/route";
import * as flowSummary from "./flows/summary/route";
import * as projectArchive from "./projects/[id]/archive/route";
import * as projectDetail from "./projects/[id]/route";
import * as projects from "./projects/route";
import * as reportJobRetry from "./report-jobs/[jobId]/retry/route";
import * as reportJob from "./report-jobs/[jobId]/route";
import * as reportRestore from "./reports/[auditId]/restore/route";
import * as reportDetail from "./reports/[auditId]/route";
import * as reports from "./reports/route";
import * as uploadPresigned from "./uploads/presigned/route";
import * as uploads from "./uploads/route";
import * as userDetail from "./users/[id]/route";
import * as users from "./users/route";

// Route Handlers have different generated context shapes; the matrix supplies
// the matching superset at runtime and intentionally erases that variance here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (request: NextRequest, context: any) => Promise<Response>;
type RouteCase = { name: string; method: string; handler: Handler; context?: Record<string, unknown>; query?: string };

const context = {
  params: Promise.resolve({
    auditId: "audit/1",
    auditReviewId: "review/1",
    questionCode: "Q/1",
    commentId: "comment/1",
    id: "resource/1",
    jobId: "job/1",
  }),
};

const routes: RouteCase[] = [
  { name: "audit answers", method: "PUT", handler: auditReviewAnswers.PUT, context },
  { name: "complete review", method: "POST", handler: auditCompleteReview.POST, context },
  { name: "audit finding", method: "PATCH", handler: auditFinding.PATCH, context },
  { name: "reopen review", method: "POST", handler: auditReopen.POST, context },
  { name: "open review", method: "POST", handler: auditOpenReview.POST, context },
  { name: "audit status", method: "PATCH", handler: auditStatus.PATCH, context },
  { name: "audit detail", method: "GET", handler: auditDetail.GET, context },
  { name: "delete audit", method: "DELETE", handler: auditDetail.DELETE, context },
  { name: "send audit", method: "POST", handler: auditSendForReview.POST, context },
  { name: "review detail", method: "GET", handler: auditReviewDetail.GET, context },
  { name: "audit list", method: "GET", handler: audits.GET, query: "status=completed&auditor=u1&limit=10&last_eval_id=a1" },
  { name: "update comment", method: "PUT", handler: commentDetail.PUT, context },
  { name: "create comment", method: "POST", handler: comments.POST },
  { name: "comment list", method: "GET", handler: comments.GET, query: "audit_id=audit%2F1" },
  { name: "dashboard", method: "GET", handler: dashboard.GET },
  { name: "archive facility", method: "POST", handler: facilityArchive.POST, context },
  { name: "restore facility", method: "POST", handler: facilityRestore.POST, context },
  { name: "facility detail", method: "GET", handler: facilityDetail.GET, context },
  { name: "update facility", method: "PUT", handler: facilityDetail.PUT, context },
  { name: "delete facility", method: "DELETE", handler: facilityDetail.DELETE, context },
  { name: "facility list", method: "GET", handler: facilities.GET, query: "limit=10&cursor=c1&status=active&search=x&projectId=p1" },
  { name: "create facility", method: "POST", handler: facilities.POST },
  { name: "facility upload", method: "POST", handler: facilityUpload.POST },
  { name: "flow detail", method: "GET", handler: flowDetail.GET, context },
  { name: "update flow", method: "PUT", handler: flowDetail.PUT, context },
  { name: "delete flow", method: "DELETE", handler: flowDetail.DELETE, context },
  { name: "flow list", method: "GET", handler: flows.GET },
  { name: "create flow", method: "POST", handler: flows.POST },
  { name: "flow summary", method: "GET", handler: flowSummary.GET },
  { name: "archive project", method: "POST", handler: projectArchive.POST, context },
  { name: "project detail", method: "GET", handler: projectDetail.GET, context },
  { name: "update project", method: "PATCH", handler: projectDetail.PATCH, context },
  { name: "delete project", method: "DELETE", handler: projectDetail.DELETE, context },
  { name: "project list", method: "GET", handler: projects.GET, query: "limit=10&cursor=c1&status=active&search=x&sortBy=name&sortOrder=asc" },
  { name: "create project", method: "POST", handler: projects.POST },
  { name: "retry report job", method: "POST", handler: reportJobRetry.POST, context },
  { name: "report job", method: "GET", handler: reportJob.GET, context },
  { name: "restore report", method: "POST", handler: reportRestore.POST, context },
  { name: "report detail", method: "GET", handler: reportDetail.GET, context },
  { name: "archive report", method: "DELETE", handler: reportDetail.DELETE, context },
  { name: "report list", method: "GET", handler: reports.GET, query: "project_id=p1&include_archived=true" },
  { name: "presigned upload", method: "POST", handler: uploadPresigned.POST },
  { name: "create upload", method: "POST", handler: uploads.POST },
  { name: "update user", method: "PATCH", handler: userDetail.PATCH, context },
  { name: "delete user", method: "DELETE", handler: userDetail.DELETE, context },
  { name: "user list", method: "GET", handler: users.GET, query: "role=viewer" },
  { name: "create user", method: "POST", handler: users.POST },
];

function requestFor(route: RouteCase): NextRequest {
  const url = `http://localhost/api/test${route.query ? `?${route.query}` : ""}`;
  const body = ["POST", "PUT", "PATCH"].includes(route.method)
    ? JSON.stringify({ name: "Example", filename: "image.png", content_type: "image/png", reason: "Correction", expected_version: 1 })
    : undefined;
  return body
    ? new NextRequest(url, { method: route.method, body, headers: { "content-type": "application/json" } })
    : new NextRequest(url, { method: route.method });
}

describe("protected BFF route contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_BACKEND_URL = "http://backend.test";
    mocks.serverEnv.mockReturnValue({ cookies: { accessName: "access", refreshName: "refresh", sessionName: "session" } });
    mocks.cookies.mockResolvedValue({ get: vi.fn(() => ({ value: "token" })) });
  });

  it.each(routes)("forwards successful JSON for $name", async (route) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })));
    const response = await route.handler(requestFor(route), route.context ?? {});
    expect(response.status).toBeLessThan(300);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each(routes)("rejects missing session for $name", async (route) => {
    vi.stubGlobal("fetch", vi.fn());
    mocks.cookies.mockResolvedValueOnce({ get: vi.fn(() => undefined) });
    const response = await route.handler(requestFor(route), route.context ?? {});
    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(routes)("maps transport failure for $name", async (route) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const response = await route.handler(requestFor(route), route.context ?? {});
    expect(response.status).toBeGreaterThanOrEqual(500);
  });

  it.each(routes)("preserves upstream JSON errors for $name", async (route) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "RULE_FAILED" }), {
      status: 422,
      headers: { "content-type": "application/json" },
    })));
    const response = await route.handler(requestFor(route), route.context ?? {});
    expect(response.status).toBe(422);
  });

  it.each(routes)("preserves upstream text errors for $name", async (route) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("upstream unavailable", {
      status: 503,
      headers: { "content-type": "text/plain" },
    })));
    const response = await route.handler(requestFor(route), route.context ?? {});
    expect(response.status).toBe(503);
  });

  it.each(routes)("preserves upstream authentication failure for $name", async (route) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "expired" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    })));
    const response = await route.handler(requestFor(route), route.context ?? {});
    expect(response.status).toBe(401);
  });

  it.each(routes)("handles an empty upstream error for $name", async (route) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", {
      status: 503,
      headers: { "content-type": "text/plain" },
    })));
    const response = await route.handler(requestFor(route), route.context ?? {});
    expect(response.status).toBe(503);
  });

  it.each(routes)("maps non-JSON upstream response for $name", async (route) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("accepted", {
      status: 200,
      headers: { "content-type": "text/plain" },
    })));
    const response = await route.handler(requestFor(route), route.context ?? {});
    const jsonOnlyFailures = new Set([
      "audit list", "facility detail", "facility list", "flow detail", "update flow",
      "flow list", "create flow", "flow summary", "project list", "presigned upload",
      "create upload", "user list",
    ]);
    const specialStatuses: Record<string, number> = {
      "delete flow": 204,
      "create project": 201,
      "create user": 204,
    };
    expect(response.status).toBe(specialStatuses[route.name] ?? (jsonOnlyFailures.has(route.name) ? 502 : 200));
  });

  it.each([
    ["audit answers", auditReviewAnswers.PUT, context],
    ["audit finding", auditFinding.PATCH, context],
    ["audit status", auditStatus.PATCH, context],
    ["reopen review", auditReopen.POST, context],
    ["update comment", commentDetail.PUT, context],
    ["create comment", comments.POST, {}],
    ["update facility", facilityDetail.PUT, context],
    ["create facility", facilities.POST, {}],
    ["facility upload", facilityUpload.POST, {}],
    ["update flow", flowDetail.PUT, context],
    ["create flow", flows.POST, {}],
    ["update project", projectDetail.PATCH, context],
    ["create project", projects.POST, {}],
    ["presigned upload", uploadPresigned.POST, {}],
    ["create upload", uploads.POST, {}],
    ["update user", userDetail.PATCH, context],
    ["create user", users.POST, {}],
  ] as const)("returns 400 for malformed JSON in %s", async (_name, handler, routeContext) => {
    vi.stubGlobal("fetch", vi.fn());
    const request = new NextRequest("http://localhost", { method: "POST", body: "{" });
    const response = await (handler as Handler)(request, routeContext);
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("validates required identifiers and queries before calling upstream", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const empty = { params: Promise.resolve({ id: "", commentId: "" }) };
    const validBody = new NextRequest("http://localhost", { method: "PUT", body: "{}" });
    expect((await commentDetail.PUT(validBody, empty)).status).toBe(400);
    expect((await comments.GET(new NextRequest("http://localhost"))).status).toBe(400);
    expect((await audits.GET(new Request("http://localhost?limit=bad"))).status).toBe(400);
    expect((await audits.GET(new Request("http://localhost?limit=201"))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
