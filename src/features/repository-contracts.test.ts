import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError } from "axios";

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@shared/api/http.client", () => ({ httpClient: http }));

import { DashboardRepoHttp } from "./dashboard/api/dashboard.repo.impl";
import { UsersRepoHttp } from "./users/api/users.repo.impl";
import { ReportsRepoHttp } from "./reports/api/reports.repo.impl";
import { createAuditReportRepo } from "./reports/api/audit-report.repo.impl";
import { reportJobRepo } from "./reports/api/report-job.repo.impl";
import { FacilitiesRepoHttp } from "./facilities/api/facilities.repo.impl";
import { ProjectsRepoHttp } from "./projects/api/projects.repo.impl";
import { FlowsApiError, FlowsHttpRepo } from "./flows/api/flows.repo.impl";
import { AuditCommentsRepoHttp } from "./audits/api/audit-comments.repo.impl";
import { createAuditReviewDetailRepo } from "./audits/api/audit-review.repo.impl";
import { createAuditReviewRepo } from "./audits/api/sendReview.repo.impl";
import auditRepoImpl, { AuditsApiError } from "./audits/api/audit.repo.impl";

const facilityDTO = {
  facility_id: "facility-1",
  name: "Plant",
  status: "ACTIVE",
  created_at: "created",
  updated_at: "updated",
  created_by: "creator",
};

const projectDTO = {
  project_id: "project-1",
  name: "Project",
  status: "ACTIVE",
  users: [],
  facilities: [],
  created_at: "created",
  updated_at: "updated",
  created_by: "creator",
};

const reportDTO = {
  id: "report-1",
  status: "completed",
  created_at: "created",
  report_url: "https://example.test/report.pdf",
};

const flowDTO = {
  id: "flow-1",
  title: "Flow",
  description: null,
  steps: [{ id: "end", type: "End", images: [] }],
  flow_type: "Navigation",
  version: 1,
  is_active: true,
  created_at: "created",
  updated_at: "updated",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

describe("simple HTTP repositories", () => {
  it("maps dashboard summary and normalizes known and unexpected errors", async () => {
    const repo = new DashboardRepoHttp("/dashboard-test");
    http.get.mockResolvedValueOnce({ data: { metrics: { total_projects: 2 } } });
    await expect(repo.getSummary()).resolves.toMatchObject({ metrics: { totalProjects: 2 } });
    expect(http.get).toHaveBeenCalledWith("/dashboard-test");

    http.get.mockRejectedValueOnce({ code: "DENIED", message: "Denied", details: 1 });
    await expect(repo.getSummary()).rejects.toEqual({ code: "DENIED", message: "Denied", details: 1 });
    http.get.mockRejectedValueOnce("broken");
    await expect(repo.getSummary()).rejects.toMatchObject({ code: "UNEXPECTED_ERROR", details: "broken" });
  });

  it("executes every users operation and preserves API errors", async () => {
    const repo = new UsersRepoHttp("/users-test");
    http.get.mockResolvedValueOnce({ data: [{ id: "u", name: "User", email: "u@test", role: "viewer" }] });
    await expect(repo.getUsers({ role: "viewer" })).resolves.toMatchObject({ items: [{ id: "u" }] });
    expect(http.get).toHaveBeenCalledWith("/users-test", { params: { role: "viewer" } });

    http.post.mockResolvedValueOnce({});
    http.patch.mockResolvedValueOnce({});
    http.delete.mockResolvedValueOnce({});
    await repo.createUser({ name: "User", email: "u@test", role: "viewer" } as never);
    await repo.updateUser("u", { role: "admin" } as never);
    await repo.deleteUser("u");

    http.delete.mockRejectedValueOnce({ code: "DENIED", message: "Denied" });
    await expect(repo.deleteUser("u")).rejects.toMatchObject({ code: "DENIED" });
    http.post.mockRejectedValueOnce(new Error("down"));
    await expect(repo.createUser({} as never)).rejects.toMatchObject({ code: "UNEXPECTED_ERROR" });
    http.patch.mockRejectedValueOnce(new Error("down"));
    await expect(repo.updateUser("u", {} as never)).rejects.toMatchObject({ code: "UNEXPECTED_ERROR" });
  });

  it("executes report list, detail, archive and restore contracts", async () => {
    const repo = new ReportsRepoHttp("/reports-test");
    http.get
      .mockResolvedValueOnce({ data: { reports: [reportDTO], count: 1 } })
      .mockResolvedValueOnce({ data: reportDTO });
    await expect(repo.list({ status: "completed", limit: 2, includeArchived: true })).resolves.toMatchObject({
      count: 1,
    });
    await expect(repo.getById("id / special")).resolves.toMatchObject({ id: "report-1" });
    expect(http.get).toHaveBeenLastCalledWith("/reports-test/id%20%2F%20special");
    http.delete.mockResolvedValueOnce({});
    http.post.mockResolvedValueOnce({});
    await repo.delete("report-1");
    await repo.restore("report-1");

    for (const action of [
      () => repo.list(),
      () => repo.getById("x"),
      () => repo.delete("x"),
      () => repo.restore("x"),
    ]) {
      http.get.mockRejectedValueOnce("down");
      http.delete.mockRejectedValueOnce("down");
      http.post.mockRejectedValueOnce("down");
      await expect(action()).rejects.toMatchObject({ code: "UNEXPECTED_ERROR" });
    }
  });

  it("creates an injectable audit report repository", async () => {
    const client = { get: vi.fn().mockResolvedValue({ data: reportDTO }) };
    const repo = createAuditReportRepo(client as never);
    await expect(repo.getReport("audit / 1")).resolves.toMatchObject({ id: "report-1" });
    expect(client.get).toHaveBeenCalledWith(expect.stringContaining("audit%20%2F%201"));
  });
});

describe("facilities and projects repositories", () => {
  it("executes all facility operations and response envelope variants", async () => {
    const repo = new FacilitiesRepoHttp("/facilities-test");
    http.get
      .mockResolvedValueOnce({ data: { facilities: [facilityDTO] } })
      .mockResolvedValueOnce({ data: { facility: facilityDTO } });
    await expect(repo.getFacilities({ status: "ACTIVE", limit: 10 })).resolves.toMatchObject({
      items: [{ id: "facility-1" }],
    });
    await expect(repo.getById("facility-1")).resolves.toMatchObject({ id: "facility-1" });

    http.post
      .mockResolvedValueOnce({ data: { data: facilityDTO } })
      .mockResolvedValueOnce({ data: facilityDTO })
      .mockResolvedValueOnce({ data: { facility: facilityDTO } })
      .mockResolvedValueOnce({ data: { data: { upload_url: "https://s3.test/key?signature=x", key: "key", expires_in: 60 } } });
    http.put.mockResolvedValueOnce({ data: { facility: facilityDTO } });
    http.delete.mockResolvedValueOnce({});

    await expect(repo.create({ name: "Plant" })).resolves.toMatchObject({ id: "facility-1" });
    await expect(repo.update({ id: "facility-1", name: "Updated" })).resolves.toMatchObject({ id: "facility-1" });
    await repo.delete("facility-1");
    await expect(repo.archive("facility-1")).resolves.toMatchObject({ id: "facility-1" });
    await expect(repo.restore("facility-1")).resolves.toMatchObject({ id: "facility-1" });
    await expect(repo.getUploadSignedUrl("photo.jpg", "image/jpeg")).resolves.toEqual({
      uploadUrl: "https://s3.test/key?signature=x",
      publicUrl: "https://s3.test/key",
      key: "key",
      expiresIn: 60,
    });
  });

  it("uploads facility files and returns structured upload failures", async () => {
    const repo = new FacilitiesRepoHttp();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 200 }))
      .mockResolvedValueOnce(new Response("denied", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
    await expect(repo.uploadFile("https://s3.test/key", file)).resolves.toBeUndefined();
    await expect(repo.uploadFile("https://s3.test/key", file)).rejects.toMatchObject({
      code: "UPLOAD_FAILED",
      details: { status: 403, body: "denied" },
    });
  });

  it("normalizes facility transport errors", async () => {
    const repo = new FacilitiesRepoHttp();
    const calls = [
      () => repo.getFacilities(),
      () => repo.getById("x"),
      () => repo.create({ name: "x" }),
      () => repo.update({ id: "x" }),
      () => repo.delete("x"),
      () => repo.archive("x"),
      () => repo.restore("x"),
      () => repo.getUploadSignedUrl("x", "image/png"),
    ];
    for (const call of calls) {
      for (const method of Object.values(http)) method.mockRejectedValueOnce("down");
      await expect(call()).rejects.toMatchObject({ code: "UNEXPECTED_ERROR" });
    }
  });

  it("executes all project operations and request mappings", async () => {
    const repo = new ProjectsRepoHttp("/projects-test");
    http.get
      .mockResolvedValueOnce({ data: { data: { projects: [projectDTO], limit: 5 }, status: "ok" } })
      .mockResolvedValueOnce({ data: { project: projectDTO } });
    await expect(repo.getProjects({ limit: 5, status: "ACTIVE" })).resolves.toMatchObject({ items: [{ id: "project-1" }] });
    await expect(repo.getById("project-1")).resolves.toMatchObject({ id: "project-1" });
    http.post
      .mockResolvedValueOnce({ data: { data: projectDTO } })
      .mockResolvedValueOnce({ data: projectDTO });
    http.patch.mockResolvedValueOnce({ data: { project: projectDTO } });
    http.delete.mockResolvedValueOnce({});
    const fields = {
      name: "Project",
      code: "P",
      description: "Description",
      users: [{ id: "u", name: "User" }],
      facilities: [{ id: "f", name: "Plant" }],
      status: "ACTIVE",
    } as const;
    await expect(repo.create(fields as never)).resolves.toMatchObject({ id: "project-1" });
    await expect(repo.update({ id: "project-1", ...fields } as never)).resolves.toMatchObject({ id: "project-1" });
    await repo.deleteProject("project-1");
    await expect(repo.archive("project-1")).resolves.toMatchObject({ id: "project-1" });
  });

  it("normalizes project errors for every operation", async () => {
    const repo = new ProjectsRepoHttp();
    const calls = [
      () => repo.getProjects(),
      () => repo.getById("x"),
      () => repo.create({ name: "x" } as never),
      () => repo.update({ id: "x" } as never),
      () => repo.deleteProject("x"),
      () => repo.archive("x"),
    ];
    for (const call of calls) {
      for (const method of Object.values(http)) method.mockRejectedValueOnce(new Error("down"));
      await expect(call()).rejects.toMatchObject({ code: "UNEXPECTED_ERROR" });
    }
  });
});

describe("response envelope variants", () => {
  it("unwraps every facility envelope shape", async () => {
    const repo = new FacilitiesRepoHttp("/facilities-test");

    http.get.mockResolvedValueOnce({ data: { data: facilityDTO } });
    await expect(repo.getById("facility-1")).resolves.toMatchObject({ id: "facility-1" });
    http.get.mockResolvedValueOnce({ data: facilityDTO });
    await expect(repo.getById("facility-1")).resolves.toMatchObject({ id: "facility-1" });

    http.post.mockResolvedValueOnce({ data: { facility: facilityDTO } });
    await expect(repo.create({ name: "Plant" })).resolves.toMatchObject({ id: "facility-1" });

    http.put.mockResolvedValueOnce({ data: { data: facilityDTO } });
    await expect(repo.update({ id: "facility-1" })).resolves.toMatchObject({ id: "facility-1" });
    http.put.mockResolvedValueOnce({ data: facilityDTO });
    await expect(repo.update({ id: "facility-1" })).resolves.toMatchObject({ id: "facility-1" });

    http.post.mockResolvedValueOnce({ data: { data: facilityDTO } });
    await expect(repo.archive("facility-1")).resolves.toMatchObject({ id: "facility-1" });
    http.post.mockResolvedValueOnce({ data: facilityDTO });
    await expect(repo.archive("facility-1")).resolves.toMatchObject({ id: "facility-1" });

    http.post.mockResolvedValueOnce({ data: { data: facilityDTO } });
    await expect(repo.restore("facility-1")).resolves.toMatchObject({ id: "facility-1" });
    http.post.mockResolvedValueOnce({ data: facilityDTO });
    await expect(repo.restore("facility-1")).resolves.toMatchObject({ id: "facility-1" });
  });

  it("keeps an unsigned upload url untouched", async () => {
    const repo = new FacilitiesRepoHttp();
    http.post.mockResolvedValueOnce({
      data: { upload_url: "https://s3.test/key", key: "key", expires_in: 60 },
    });

    await expect(repo.getUploadSignedUrl("photo.jpg", "image/jpeg")).resolves.toEqual({
      uploadUrl: "https://s3.test/key",
      publicUrl: "https://s3.test/key",
      key: "key",
      expiresIn: 60,
    });
  });

  it("falls back to a binary content type when the file declares none", async () => {
    const repo = new FacilitiesRepoHttp();
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await repo.uploadFile("https://s3.test/key", new File(["x"], "blob"));
    expect(fetchMock.mock.calls[0][1].headers["Content-Type"]).toBe("application/octet-stream");
  });

  it("unwraps every project envelope shape", async () => {
    const repo = new ProjectsRepoHttp("/projects-test");

    http.get.mockResolvedValueOnce({ data: { data: projectDTO } });
    await expect(repo.getById("project-1")).resolves.toMatchObject({ id: "project-1" });
    http.get.mockResolvedValueOnce({ data: projectDTO });
    await expect(repo.getById("project-1")).resolves.toMatchObject({ id: "project-1" });

    http.post.mockResolvedValueOnce({ data: { project: projectDTO } });
    await expect(repo.create({ name: "Project" } as never)).resolves.toMatchObject({ id: "project-1" });

    http.patch.mockResolvedValueOnce({ data: { data: projectDTO } });
    await expect(repo.update({ id: "project-1" } as never)).resolves.toMatchObject({ id: "project-1" });
    http.patch.mockResolvedValueOnce({ data: projectDTO });
    await expect(repo.update({ id: "project-1" } as never)).resolves.toMatchObject({ id: "project-1" });

    http.post.mockResolvedValueOnce({ data: { data: projectDTO } });
    await expect(repo.archive("project-1")).resolves.toMatchObject({ id: "project-1" });
    http.post.mockResolvedValueOnce({ data: projectDTO });
    await expect(repo.archive("project-1")).resolves.toMatchObject({ id: "project-1" });
  });

  it("preserves a structured api error thrown by the transport", async () => {
    const repo = new ProjectsRepoHttp();
    http.get.mockRejectedValueOnce({ code: "FORBIDDEN", message: "not allowed" });

    await expect(repo.getById("project-1")).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "not allowed",
    });
  });

  it("classifies flow failures that are not axios errors", async () => {
    const repo = new FlowsHttpRepo();

    http.get.mockRejectedValueOnce(new Error("socket hang up"));
    await expect(repo.list()).rejects.toMatchObject({ message: "socket hang up", status: undefined });

    http.get.mockRejectedValueOnce("down");
    await expect(repo.getById("flow-1")).rejects.toMatchObject({ message: "Failed to get flow" });
  });
});

describe("flows and review repositories", () => {
  it("executes all flow operations", async () => {
    const repo = new FlowsHttpRepo();
    http.get
      .mockResolvedValueOnce({ data: { flows: [flowDTO], total: 1, limit: 10, offset: 0 } })
      .mockResolvedValueOnce({ data: flowDTO });
    await expect(repo.list()).resolves.toMatchObject({ total: 1 });
    await expect(repo.getById("flow-1")).resolves.toMatchObject({ id: "flow-1" });
    http.post
      .mockResolvedValueOnce({ data: { uploadUrl: "upload", publicUrl: "public" } })
      .mockResolvedValueOnce({ data: { id: "created" } });
    http.put
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ data: { id: "updated" } });
    http.delete.mockResolvedValueOnce({});
    await expect(repo.getPresignedUrl("photo", "image/png")).resolves.toEqual({ uploadUrl: "upload", publicUrl: "public" });
    await repo.uploadFile("https://s3.test/key", new File(["x"], "x.png", { type: "image/png" }));
    await expect(repo.create(flowDTO as never)).resolves.toEqual({ id: "created" });
    await expect(repo.update("flow-1", flowDTO as never)).resolves.toEqual({ id: "updated" });
    await repo.delete("flow-1");
  });

  it("returns null for missing flows and classifies validation and transport errors", async () => {
    const repo = new FlowsHttpRepo();
    http.get.mockRejectedValueOnce(
      new AxiosError("missing", undefined, undefined, undefined, { status: 404 } as never),
    );
    await expect(repo.getById("missing")).resolves.toBeNull();

    http.get.mockResolvedValueOnce({ data: { invalid: true } });
    await expect(repo.list()).rejects.toMatchObject({ status: 500 });
    http.post.mockRejectedValueOnce(new Error("presign failed"));
    await expect(repo.getPresignedUrl("x", "image/png")).rejects.toMatchObject({ message: "presign failed" });
    http.put.mockRejectedValueOnce(new Error("upload failed"));
    await expect(repo.uploadFile("x", new File(["x"], "x"))).rejects.toMatchObject({ message: "upload failed" });
    http.post.mockRejectedValueOnce("down");
    await expect(repo.create(flowDTO as never)).rejects.toMatchObject({ message: "Failed to create flow" });
    http.put.mockRejectedValueOnce("down");
    await expect(repo.update("x", flowDTO as never)).rejects.toMatchObject({ message: "Failed to update flow" });
    http.delete.mockRejectedValueOnce("down");
    await expect(repo.delete("x")).rejects.toMatchObject({ message: "Failed to delete flow" });
  });

  it("executes comment, review and send-for-review contracts with encoded identifiers", async () => {
    const injected = {
      get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(),
    };
    const comments = new AuditCommentsRepoHttp(injected as never);
    injected.post.mockResolvedValueOnce({ data: { id: "c", audit_id: "a", step_id: "s", content: "text" } });
    injected.put.mockResolvedValueOnce({ data: { id: "c", audit_id: "a", step_id: "s", content: "updated" } });
    injected.get.mockResolvedValueOnce({ data: { comments: [] } });
    await comments.createComment({ auditId: "a", stepId: "s", content: " text " });
    await comments.updateComment({ commentId: "c / 1", auditId: "a", stepId: "s", content: " updated " });
    await comments.listByAudit("a / 1");
    expect(injected.put).toHaveBeenCalledWith(expect.stringContaining("c%20%2F%201"), expect.anything());

    const reviewRepo = createAuditReviewDetailRepo(injected as never);
    const reviewDTO = { audit_id: "a", version: 1, flow_id: "f", project_id: "p", status: "draft_report_in_review", findings: [], total_cost: 0, created_at: "c", updated_at: "u" };
    injected.get.mockResolvedValueOnce({ data: reviewDTO });
    injected.post
      .mockResolvedValueOnce({ data: { audit_id: "a", status: "final_report_sent_to_client", request_id: "job" } })
      .mockResolvedValueOnce({ data: reviewDTO });
    injected.patch
      .mockResolvedValueOnce({ data: { audit_id: "a", event: "open_review", old_status: "draft_report_pending_review", new_status: "draft_report_in_review", message: "ok" } })
      .mockResolvedValueOnce({ data: { audit_id: "a", question_code: "q", status: "updated" } });
    await reviewRepo.getReviewDetail("review / 1");
    await reviewRepo.completeReview("audit / 1");
    await reviewRepo.openReview("audit / 1");
    await reviewRepo.applyEvent({ auditId: "audit / 1", event: "open_review" });
    await reviewRepo.updateFinding({ auditId: "audit / 1", questionCode: "q / 1", quantity: 2 } as never);

    const sendRepo = createAuditReviewRepo(injected as never);
    injected.post.mockResolvedValueOnce({ data: { audit_id: "a", audit_review_id: "r", status: "draft_report_pending_review" } });
    injected.get.mockResolvedValueOnce({ data: { audit_id: "a", audit_review_id: "r", status: "draft_report_in_review", review_ready: true } });
    await expect(sendRepo.sendForReview("a / 1")).resolves.toMatchObject({ auditId: "a" });
    await expect(sendRepo.pollReview("r / 1")).resolves.toMatchObject({ reviewReady: true });
  });
});

describe("fetch repositories", () => {
  it("executes report job get, retry and restore and maps failures", async () => {
    const job = { job_id: "j", project_id: "p", trigger_audit_id: "a", status: "queued", attempt: 1 };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(job), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(job), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(job), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "failed" }), { status: 409 }))
      .mockResolvedValueOnce(new Response("not-json", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    await reportJobRepo.get("j / 1", new AbortController().signal);
    await reportJobRepo.retry("j / 1");
    await reportJobRepo.restore("j / 1");
    await expect(reportJobRepo.get("j")).rejects.toThrow("failed");
    await expect(reportJobRepo.get("j")).rejects.toThrow("Report request failed (500)");
  });

  it("lists, reads and deletes audits across response envelopes", async () => {
    const dto = { id: "a", flow_id: "f", status: "draft_report_pending_review" };
    const detail = { id: "a", flow_id: "f", status: "draft_report_pending_review" };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ audit: detail }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ audits: [dto], total: 1 }), { status: 200 }))
      .mockResolvedValueOnce(new Response("", { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(auditRepoImpl.getById("a / 1")).resolves.toMatchObject({ id: "a" });
    await expect(auditRepoImpl.list({ status: "draft_report_pending_review", auditor: "u", limit: 5, last_eval_id: "next" })).resolves.toMatchObject({ total: 1 });
    await expect(auditRepoImpl.delete("a")).resolves.toBeUndefined();
  });

  it("classifies audit errors and invalid response bodies", async () => {
    const responses = [
      new Response("", { status: 401 }),
      new Response(JSON.stringify({ message: "Conflict" }), { status: 409, headers: { "content-type": "application/json" } }),
      new Response("broken json", { status: 500, headers: { "content-type": "application/json" } }),
      new Response("Denied", { status: 403 }),
      new Response(JSON.stringify({ unknown: true }), { status: 200 }),
    ];
    vi.stubGlobal("fetch", vi.fn(async () => responses.shift()!));
    await expect(auditRepoImpl.list()).rejects.toMatchObject({ status: 401 });
    await expect(auditRepoImpl.list()).rejects.toMatchObject({ status: 409, message: "Conflict" });
    await expect(auditRepoImpl.list()).rejects.toMatchObject({ status: 500, message: "Upstream error" });
    await expect(auditRepoImpl.delete("a")).rejects.toMatchObject({ status: 403, message: "Denied" });
    await expect(auditRepoImpl.getById("a")).rejects.toEqual(expect.any(AuditsApiError));
  });
});