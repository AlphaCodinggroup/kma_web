import { describe, expect, it } from "vitest";
import {
  mapCreateFacilityParamsToDTO,
  mapFacilitiesListFromDTO,
  mapFacilityFromDTO,
  mapUpdateFacilityParamsToDTO,
} from "./facility/lib/mappers";
import {
  mapDashboardSummaryDTO,
  mapProjectFacilitySummaryDTO,
  mapRecentActivityDTO,
} from "./dashboard/lib/mappers";
import { mapProjectFromDTO, mapProjectsListFromDTO } from "./projects/lib/mappers";
import { mapAuditDtoToDomain, mapAuditsResponseToDomain } from "./audit/lib/mappers";
import {
  mapAuditCommentResponseDTOToDomain,
  mapAuditCommentsListDTOToDomain,
  mapCreateAuditCommentInputToDTO,
  mapUpdateAuditCommentInputToDTO,
} from "./audit/lib/audit-comments.mappers";
import { mapAuditFindingDTO, mapAuditReviewDTO } from "./audit/lib/audit-review.mappers";
import { mapAuditReportDTO } from "./report/lib/audit-report.mappers";
import { mapReportListItemFromDTO, mapReportsListFromDTO } from "./report/lib/report-list.mappers";
import { mapReportJob } from "./report/model/report-job";
import { mapCognitoClaimsToUser, mapUserDTOtoDomain } from "./user/lib/mappers";
import { mapUserFromDTO, mapUsersListFromDTO } from "./user/lib/list.mappers";

describe("facility mappers", () => {
  it("maps full and compatible create payloads", () => {
    expect(
      mapCreateFacilityParamsToDTO({
        name: "Plant",
        projectId: "project-1",
        address: "Street",
        city: "City",
        description: "Description",
        notes: "Ignored",
        photoUrl: "photo.jpg",
        status: "ARCHIVED",
        geo: { lat: 1, lng: 2 },
      }),
    ).toEqual({
      name: "Plant",
      project_id: "project-1",
      address: "Street",
      city: "City",
      description: "Description",
      photo_url: "photo.jpg",
      status: "ARCHIVED",
      geo: { lat: 1, lng: 2 },
    });
    expect(mapCreateFacilityParamsToDTO({ name: "Minimal", notes: "Legacy note" })).toEqual({
      name: "Minimal",
      description: "Legacy note",
      status: "ACTIVE",
    });
    expect(mapCreateFacilityParamsToDTO({ name: "Empty" })).toEqual({
      name: "Empty",
      status: "ACTIVE",
    });
  });

  it("maps update fields, legacy notes and photo clearing", () => {
    expect(
      mapUpdateFacilityParamsToDTO({
        id: "facility-1",
        name: "Updated",
        address: "Address",
        city: "City",
        description: "Description",
        photoUrl: "photo.jpg",
        status: "ACTIVE",
        geo: { lat: 3, lng: 4 },
      }),
    ).toEqual({
      name: "Updated",
      address: "Address",
      city: "City",
      description: "Description",
      photo_url: "photo.jpg",
      status: "ACTIVE",
      geo: { lat: 3, lng: 4 },
    });
    expect(mapUpdateFacilityParamsToDTO({ id: "facility-1", notes: "Legacy", clearPhoto: true })).toEqual({
      description: "Legacy",
      photo_url: null,
    });
    expect(mapUpdateFacilityParamsToDTO({ id: "facility-1" })).toEqual({});
  });

  it("maps full and minimal facility responses and pagination", () => {
    const full = mapFacilityFromDTO({
      facility_id: "facility-1",
      project_id: "project-1",
      name: "Plant",
      address: "Address",
      city: "City",
      description: "Description",
      notes: "Notes",
      photo_url: "photo.jpg",
      geo: { lat: 1, lng: 2 },
      status: "ARCHIVED",
      user_ids: ["user-1"],
      created_at: "created",
      updated_at: "updated",
      created_by: "creator",
      updated_by: "updater",
      archived_at: null,
      archived_by: "archiver",
    });
    expect(full).toMatchObject({
      id: "facility-1",
      projectId: "project-1",
      notes: "Notes",
      photoUrl: "photo.jpg",
      archivedAt: null,
      archivedBy: "archiver",
    });

    const minimal = mapFacilityFromDTO({
      facility_id: "facility-2",
      name: "Minimal",
      description: "Description as note",
      status: "ACTIVE",
      created_at: "created",
      updated_at: "updated",
      created_by: "creator",
    });
    expect(minimal).toMatchObject({ projectId: "", userIds: [], notes: "Description as note" });
    expect(minimal).not.toHaveProperty("archivedAt");

    expect(
      mapFacilitiesListFromDTO({ facilities: [full as never], limit: 20, cursor: "next" }),
    ).toMatchObject({ limit: 20, cursor: "next" });
    expect(mapFacilitiesListFromDTO({ facilities: [], limit: null, cursor: null })).toEqual({ items: [] });
  });
});

describe("dashboard mappers", () => {
  it("maps numbers, strings, nulls and lists", () => {
    expect(
      mapProjectFacilitySummaryDTO({
        project_id: 9 as never,
        project_name: null,
        facilities_unassigned: "2" as never,
        facilities_completed: Number.NaN,
      }),
    ).toEqual({
      projectId: "9",
      projectName: "",
      facilitiesUnassigned: 2,
      facilitiesCompleted: 0,
    });

    expect(
      mapRecentActivityDTO({ audit_id: "a", project_id: null, auditor_name: 7 as never }),
    ).toMatchObject({ auditId: "a", projectId: "", auditorName: "7", completedAt: "" });

    const summary = mapDashboardSummaryDTO({
      metrics: {
        total_projects: 2,
        total_facilities: "3" as never,
        total_facilities_unassigned: null,
        total_audits_completed: Number.POSITIVE_INFINITY,
      },
      project_facilities_summary: [{ project_id: "p" }],
      recent_activity: [{ audit_id: "a" }],
    });
    expect(summary.metrics).toMatchObject({
      totalProjects: 2,
      totalFacilities: 3,
      totalFacilitiesUnassigned: 0,
      totalAuditsCompleted: 0,
    });
    expect(summary.projectFacilitiesSummary).toHaveLength(1);
    expect(summary.recentActivity).toHaveLength(1);
    expect(mapDashboardSummaryDTO({ metrics: null })).toMatchObject({
      projectFacilitiesSummary: [],
      recentActivity: [],
    });
  });
});

describe("project and audit list mappers", () => {
  it("maps project collections and defaults", () => {
    const project = mapProjectFromDTO({
      project_id: "p1",
      name: "Project",
      status: "ACTIVE",
      users: [{ id: "u1", name: "User" }],
      facilities: [{ facility_id: "f1", name: "Plant" }],
      created_at: "created",
      updated_at: "updated",
      created_by: "creator",
    });
    expect(project).toMatchObject({ code: "", description: "", users: [{ id: "u1" }] });
    expect(
      mapProjectsListFromDTO({ data: { projects: [project as never], cursor: undefined }, status: "ok" } as never),
    ).toMatchObject({ limit: 0, cursor: "" });
  });

  it("maps audit aliases, trimmed identifiers and invalid collections", () => {
    const audit = mapAuditDtoToDomain({
      id: "a1",
      flow_id: "flow",
      status: "draft_report_in_review",
      project_id: " project ",
      facility_id: " ",
      created_by: " creator ",
      created_at: " created ",
      findings_count: 2,
    });
    expect(audit).toMatchObject({
      version: 1,
      projectId: "project",
      facilityId: null,
      createdBy: "creator",
      createdAt: "created",
      projectName: "",
      findingsCount: 2,
    });
    expect(mapAuditsResponseToDomain({ audits: [audit as never] })).toHaveLength(1);
    expect(mapAuditsResponseToDomain({ audits: null as never })).toEqual([]);
  });
});

describe("audit comment and review mappers", () => {
  it("maps comment commands, aliases, versions and empty lists", () => {
    expect(
      mapCreateAuditCommentInputToDTO({ auditId: "a", stepId: "s", content: " text " }),
    ).toEqual({ audit_id: "a", step_id: "s", content: "text" });
    expect(mapUpdateAuditCommentInputToDTO({ commentId: "c", auditId: "a", stepId: "s", content: " update " })).toEqual({
      step_id: "s",
      content: "update",
    });
    expect(
      mapAuditCommentResponseDTOToDomain({
        id: "c",
        auditId: "a",
        stepId: "s",
        userId: "u",
        version: "2",
        updated_at: "updated",
      }),
    ).toMatchObject({ auditId: "a", stepId: "s", userId: "u", version: 2, createdAt: "updated" });
    expect(mapAuditCommentResponseDTOToDomain({ id: "c2", version: "bad" })).toMatchObject({
      version: 1,
      createdAt: "",
      updatedAt: "",
    });
    expect(mapAuditCommentsListDTOToDomain({})).toEqual({ comments: [] });
  });

  it.each([
    [true, true],
    ["TRUE", true],
    ["false", false],
    [1, true],
    [0, false],
    [null, false],
  ])("maps review inclusion %j", (include_in_report, expected) => {
    const finding = mapAuditFindingDTO({
      question_code: "q",
      answer: "yes",
      quantity: "2" as never,
      cost: Number.NaN,
      total_cost: "6" as never,
      include_in_report: include_in_report as never,
      photos: null,
    });
    expect(finding).toMatchObject({
      quantity: 2,
      cost: 0,
      totalCost: 6,
      includeInReport: expected,
      calculatedCost: 0,
      photos: [],
    });
  });

  it("maps a full review and falls back on an unknown status", () => {
    const review = mapAuditReviewDTO({
      audit_id: "a",
      version: 0,
      flow_id: "f",
      project_id: "p",
      status: "future",
      findings: [],
      total_cost: 7,
      created_at: "created",
      updated_at: "updated",
    });
    // An unrecognised state falls back to a known one instead of being cast
    // through, which used to surface as a blank badge with no error.
    expect(review).toMatchObject({ version: 0, status: "draft_report_pending_review", totalCost: 7 });
  });
});

describe("report and user mappers", () => {
  const report = {
    id: "report-1",
    flow_id: " flow ",
    user_id: "",
    status: "completed",
    report_name: " Report ",
    report_url: 7 as never,
    created_at: "created",
    included_audits: ["a@audit:1/review:1"],
  };

  it("maps report details, list defaults and jobs", () => {
    expect(mapAuditReportDTO(report)).toMatchObject({
      flowId: "flow",
      userId: null,
      reportName: "Report",
      reportUrl: null,
      attempt: 1,
      archivedAt: null,
    });
    expect(mapReportListItemFromDTO(report)).toMatchObject({ id: "report-1" });
    expect(mapReportsListFromDTO({ reports: [report], count: Number.NaN })).toMatchObject({
      count: 1,
      lastEvalId: null,
      hasMore: false,
    });
    expect(
      mapReportJob({
        job_id: "job",
        project_id: "project",
        trigger_audit_id: "audit",
        audits: [{ audit_id: "audit", audit_version: 2, review_version: 3 }],
        status: "succeeded",
        attempt: 1,
        retryable: true,
      }),
    ).toMatchObject({
      jobId: "job",
      audits: [{ auditId: "audit", auditVersion: 2, reviewVersion: 3 }],
      reportKey: null,
      retryable: true,
    });
  });

  it("maps flexible users and Cognito claims", () => {
    expect(mapUserDTOtoDomain(null)).toMatchObject({
      id: "unknown",
      name: "User",
      username: "user",
      role: "viewer",
    });
    expect(mapUserDTOtoDomain({ id: 7, username: "login", role: "admin" })).toMatchObject({
      id: "7",
      name: "login",
      username: "login",
      role: "admin",
    });
    expect(
      mapCognitoClaimsToUser({ sub: "sub", name: "Name", "cognito:groups": ["administrator"] }),
    ).toMatchObject({ id: "sub", username: "sub", name: "Name", role: "administrator" });
    expect(mapCognitoClaimsToUser({})).toMatchObject({
      id: "unknown",
      username: "user",
      name: "user",
      role: "viewer",
    });
    expect(mapUserFromDTO({ id: "u", name: "User", email: "u@example.test", role: "viewer" })).toMatchObject({
      cognitoId: "",
    });
    expect(mapUsersListFromDTO([])).toEqual({ items: [] });
    expect(mapUsersListFromDTO(null as never)).toEqual({ items: [] });
  });
});
