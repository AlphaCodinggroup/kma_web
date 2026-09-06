import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@features/audits/api/audit-review.repo.impl", () => ({
  auditReviewDetailRepo: {},
}));
vi.mock("@features/audits/api/audit-comments.repo.impl", () => ({
  auditCommentsRepo: {},
}));
vi.mock("@features/audits/api/audit.repo.impl", () => ({ default: {} }));
vi.mock("@features/audits/api/sendReview.repo.impl", () => ({
  auditReviewRepo: {},
}));
vi.mock("@features/projects/api/projects.repo.impl", () => ({
  projectsRepoImpl: { archive: vi.fn(), deleteProject: vi.fn() },
}));
vi.mock("@features/dashboard/api/dashboard.repo.impl", () => ({
  dashboardRepoImpl: {},
}));
vi.mock("@features/facilities/api/facilities.repo.impl", () => ({
  facilitiesRepoImpl: {},
}));

import { completeReviewAudit } from "./audits/lib/usecases/completeReviewAudit";
import { createAuditComment } from "./audits/lib/usecases/createAuditComment";
import { deleteAudit } from "./audits/lib/usecases/deleteAudit";
import { makeGetReviewProgressUsecase } from "./audits/lib/usecases/get-review-progress";
import { getAuditById } from "./audits/lib/usecases/getAuditById";
import { listAuditComments } from "./audits/lib/usecases/listAuditComments";
import { listAudits } from "./audits/lib/usecases/listAudits";
import { makeSendForReviewUsecase } from "./audits/lib/usecases/send-for-review";
import { updateAuditAnswer } from "./audits/lib/usecases/updateAuditAnswer";
import { updateAuditComment } from "./audits/lib/usecases/updateAuditComment";
import { updateAuditFinding } from "./audits/lib/usecases/updateAuditFinding";
import { applyAuditEvent } from "./audits/lib/usecases/updateAuditReviewStatus";
import { createProject } from "./projects/lib/usecases/create-project";
import { deleteProject } from "./projects/lib/usecases/deleteProject";
import { fetchProjects } from "./projects/lib/usecases/fetch-projects";
import { updateProject } from "./projects/lib/usecases/update-project";
import { fetchReportById } from "./reports/lib/usecases/fetch-report-by-id";
import { fetchReports } from "./reports/lib/usecases/fetch-reports";
import { getDashboardSummary } from "./dashboard/lib/usecases/get-dashboard-summary";
import { archiveFacilityUseCase } from "./facilities/lib/usecases/archive-facility.usecase";
import { deleteFacilityUseCase } from "./facilities/lib/usecases/delete-facility.usecase";

describe("application use case contracts", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("completes an audit review and validates its id", async () => {
    const completeReview = vi.fn().mockResolvedValue({ jobId: "job-1" });
    await expect(
      completeReviewAudit("audit-1", { auditReviewRepo: { completeReview } } as never)
    ).resolves.toEqual({ jobId: "job-1" });
    expect(completeReview).toHaveBeenCalledWith("audit-1");
    await expect(
      completeReviewAudit("", { auditReviewRepo: { completeReview } } as never)
    ).rejects.toThrow("auditId is required");
  });

  it("creates a trimmed audit comment", async () => {
    const createComment = vi.fn().mockResolvedValue({ id: "comment-1" });
    const input = { auditId: "audit-1", stepId: "step-1", content: "  text  " };
    await expect(createAuditComment(input, { repo: { createComment } } as never)).resolves.toEqual({
      id: "comment-1",
    });
    expect(createComment).toHaveBeenCalledWith({ ...input, content: "text" });
  });

  it.each([
    [{ auditId: "", stepId: "step", content: "text" }, "auditId is required"],
    [{ auditId: "audit", stepId: "", content: "text" }, "stepId is required"],
    [{ auditId: "audit", stepId: "step", content: " " }, "content is required"],
  ])("validates audit comment creation", async (input, message) => {
    await expect(createAuditComment(input, { repo: {} } as never)).rejects.toThrow(message);
  });

  it("updates a trimmed audit comment", async () => {
    const updateComment = vi.fn().mockResolvedValue({ id: "comment-1" });
    const input = {
      commentId: "comment-1",
      auditId: "audit-1",
      stepId: "step-1",
      content: "  changed  ",
    };
    await updateAuditComment(input, { repo: { updateComment } } as never);
    expect(updateComment).toHaveBeenCalledWith({ ...input, content: "changed" });
  });

  it.each([
    [
      { commentId: "", auditId: "audit", stepId: "step", content: "text" },
      "commentId is required",
    ],
    [
      { commentId: "comment", auditId: "", stepId: "step", content: "text" },
      "auditId is required",
    ],
    [
      { commentId: "comment", auditId: "audit", stepId: "", content: "text" },
      "stepId is required",
    ],
    [
      { commentId: "comment", auditId: "audit", stepId: "step", content: " " },
      "content is required",
    ],
  ])("validates audit comment updates", async (input, message) => {
    await expect(updateAuditComment(input, { repo: {} } as never)).rejects.toThrow(message);
  });

  it("delegates audit reads, listing, deletion and progress operations", async () => {
    const repo = {
      delete: vi.fn().mockResolvedValue(undefined),
      getById: vi.fn().mockResolvedValue({ id: "audit-1" }),
      list: vi.fn().mockResolvedValue({ items: [] }),
    };
    await deleteAudit("audit-1", { repo } as never);
    await expect(getAuditById("audit-1", { repo } as never)).resolves.toEqual({ id: "audit-1" });
    await expect(listAudits({ repo, params: { limit: 10 } } as never)).resolves.toEqual({ items: [] });
    expect(repo.delete).toHaveBeenCalledWith("audit-1");
    expect(repo.list).toHaveBeenCalledWith({ limit: 10 });

    const listByAudit = vi.fn().mockResolvedValue({ comments: [] });
    await expect(
      listAuditComments("audit-1", { repo: { listByAudit } } as never)
    ).resolves.toEqual({ comments: [] });
    await expect(listAuditComments("", { repo: {} } as never)).rejects.toThrow(
      "auditId is required"
    );

    const pollReview = vi.fn().mockResolvedValue({ status: "draft_report_pending_review" });
    await makeGetReviewProgressUsecase({ repo: { pollReview } as never })("review-1");
    expect(pollReview).toHaveBeenCalledWith("review-1");

    const sendForReview = vi.fn().mockResolvedValue({ auditReviewId: "review-1" });
    await makeSendForReviewUsecase({ repo: { sendForReview } as never })("audit-1");
    expect(sendForReview).toHaveBeenCalledWith("audit-1");
  });

  it("updates every supported finding field while preserving null and trimming notes", async () => {
    const updateFinding = vi.fn().mockResolvedValue({ version: 2 });
    await updateAuditFinding(
      {
        auditId: "audit-1",
        questionCode: "Q1",
        quantity: null,
        notes: "  reviewed  ",
        photos: [{ url: "photo-1" }],
      },
      { auditReviewRepo: { updateFinding } } as never
    );
    expect(updateFinding).toHaveBeenCalledWith({
      auditId: "audit-1",
      questionCode: "Q1",
      quantity: null,
      notes: "reviewed",
      photos: [{ url: "photo-1" }],
    });
  });

  it.each([
    [{ auditId: "", questionCode: "Q1", notes: "x" }, "auditId is required"],
    [{ auditId: "audit", questionCode: "", notes: "x" }, "questionCode is required"],
    [
      { auditId: "audit", questionCode: "Q1" },
      "at least one field (quantity, notes or photos) must be provided",
    ],
    [
      { auditId: "audit", questionCode: "Q1", quantity: Number.NaN },
      "quantity must be a finite number",
    ],
  ])("validates finding updates", async (input, message) => {
    await expect(
      updateAuditFinding(input as never, { auditReviewRepo: {} } as never)
    ).rejects.toThrow(message);
  });

  it("supports independent quantity, notes and photo finding patches", async () => {
    const updateFinding = vi.fn().mockResolvedValue({});
    const deps = { auditReviewRepo: { updateFinding } } as never;
    await updateAuditFinding({ auditId: "a", questionCode: "q", quantity: 2 }, deps);
    await updateAuditFinding({ auditId: "a", questionCode: "q", notes: null }, deps);
    await updateAuditFinding({ auditId: "a", questionCode: "q", photos: [] }, deps);
    expect(updateFinding.mock.calls.map(([value]) => value)).toEqual([
      { auditId: "a", questionCode: "q", quantity: 2 },
      { auditId: "a", questionCode: "q", notes: null },
      { auditId: "a", questionCode: "q", photos: [] },
    ]);
  });

  it("applies a workflow event and validates both required values", async () => {
    const applyEvent = vi.fn().mockResolvedValue({ newStatus: "draft_report_in_review" });
    const deps = { auditReviewRepo: { applyEvent } } as never;
    await applyAuditEvent({ auditId: "audit-1", event: "open_review" }, deps);
    expect(applyEvent).toHaveBeenCalledWith({ auditId: "audit-1", event: "open_review" });
    await expect(applyAuditEvent({ auditId: "", event: "open_review" }, deps)).rejects.toThrow(
      "auditId is required"
    );
    await expect(applyAuditEvent({ auditId: "audit-1", event: "" } as never, deps)).rejects.toThrow(
      "event is required"
    );
  });

  it("sends answer updates through the versioned BFF route", async () => {
    const result = { version: 3 };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(result), { status: 200, headers: { "content-type": "application/json" } })
    );
    await expect(
      updateAuditAnswer({ auditId: "audit / 1", expectedVersion: 2, answers: [] })
    ).resolves.toEqual(result);
    expect(fetch).toHaveBeenCalledWith("/api/audits-review/audit%20%2F%201/answers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expected_version: 2, answers: [] }),
    });
  });

  it("uses an API message for answer failures and a fallback for non-JSON failures", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Version conflict" }), { status: 409 })
      )
      .mockResolvedValueOnce(new Response("broken", { status: 500 }));
    await expect(
      updateAuditAnswer({ auditId: "audit", expectedVersion: 1, answers: [] })
    ).rejects.toThrow("Version conflict");
    await expect(
      updateAuditAnswer({ auditId: "audit", expectedVersion: 1, answers: [] })
    ).rejects.toThrow("Failed to update answers");
  });

  it("normalizes project creation and update inputs", async () => {
    const repo = {
      create: vi.fn().mockResolvedValue({ id: "project-1" }),
      update: vi.fn().mockResolvedValue({ id: "project-1" }),
    };
    await createProject(repo as never, {
      name: "  Project  ",
      code: "  CODE  ",
      description: "  Description  ",
    });
    expect(repo.create).toHaveBeenCalledWith({
      name: "Project",
      code: "CODE",
      description: "Description",
      status: "ACTIVE",
      users: [],
      facilities: [],
    });
    await expect(createProject(repo as never, { name: " " })).rejects.toThrow(
      "Project name is required"
    );

    await updateProject(repo as never, {
      id: "project-1",
      name: "  Name  ",
      code: "  ",
      description: "  Description  ",
      users: [{ id: "user-1", name: "User" }],
      facilities: [{ id: "facility-1", name: "Facility" }],
      status: "ARCHIVED",
    });
    expect(repo.update).toHaveBeenCalledWith({
      id: "project-1",
      name: "Name",
      code: "",
      description: "Description",
      users: [{ id: "user-1", name: "User" }],
      facilities: [{ id: "facility-1", name: "Facility" }],
      status: "ARCHIVED",
    });
  });

  it("delegates project list and deletion", async () => {
    const repo = {
      getProjects: vi.fn().mockResolvedValue({ items: [] }),
      deleteProject: vi.fn().mockResolvedValue(undefined),
    };
    await expect(fetchProjects(repo as never, { status: "ACTIVE" })).resolves.toEqual({ items: [] });
    await deleteProject("project-1", { projectsRepo: repo as never });
    expect(repo.getProjects).toHaveBeenCalledWith({ status: "ACTIVE" });
    expect(repo.deleteProject).toHaveBeenCalledWith("project-1");
  });

  it("delegates report listing and validates report detail id", async () => {
    const repo = {
      list: vi.fn().mockResolvedValue({ items: [] }),
      getById: vi.fn().mockResolvedValue({ id: "report-1" }),
    };
    await expect(fetchReports(repo as never, { limit: 10 })).resolves.toEqual({ items: [] });
    await expect(fetchReportById(repo as never, "report-1")).resolves.toEqual({ id: "report-1" });
    await expect(fetchReportById(repo as never, "")).rejects.toThrow("Report id is required");
  });

  it("delegates dashboard and facility lifecycle operations", async () => {
    const getSummary = vi.fn().mockResolvedValue({ projects: 1 });
    await expect(getDashboardSummary({ getSummary } as never)).resolves.toEqual({ projects: 1 });

    const facilityRepo = {
      archive: vi.fn().mockResolvedValue({ id: "facility-1" }),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    await archiveFacilityUseCase("  facility-1  ", facilityRepo as never);
    await deleteFacilityUseCase("  facility-1  ", facilityRepo as never);
    expect(facilityRepo.archive).toHaveBeenCalledWith("facility-1");
    expect(facilityRepo.delete).toHaveBeenCalledWith("facility-1");
    await expect(archiveFacilityUseCase("", facilityRepo as never)).rejects.toThrow(
      "Facility id is required to archive"
    );
    await expect(deleteFacilityUseCase("", facilityRepo as never)).rejects.toThrow(
      "Facility id is required to delete"
    );
  });
});
