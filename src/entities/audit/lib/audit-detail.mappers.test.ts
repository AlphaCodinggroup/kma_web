import { describe, expect, it } from "vitest";
import {
  mapAuditCommentDTO,
  mapAuditDetailDTOToDomain,
  mapAuditQuestionDTO,
  mapAuditReportItemDTO,
} from "./audit-detail.mappers";

describe("audit detail mappers", () => {
  it.each([
    [true, true],
    [8, 8],
    [" YES ", true],
    ["si", true],
    ["TRUE", true],
    ["NO", false],
    ["false", false],
    ["other", "other"],
    [null, null],
  ])("normalizes question answer %j", (answer, expected) => {
    expect(mapAuditQuestionDTO({ id: "q", answer } as never).answer).toBe(expected);
  });

  it.each([
    ["yes_no", "yes_no"],
    ["Question", "yes_no"],
    ["multiple_choice", "multiple_choice"],
    ["Select", "multiple_choice"],
    ["number", "number"],
    ["text", "text"],
    ["Form", "text"],
    ["unknown", "text"],
  ])("normalizes question type %s", (type, expected) => {
    expect(mapAuditQuestionDTO({ id: "q", type } as never).type).toBe(expected);
  });

  it("maps question aliases, attachments, code and order", () => {
    expect(
      mapAuditQuestionDTO({
        id: "q1",
        response: "yes",
        comments: "review note",
        question_code: "CODE-1",
        order: 3,
        attachments: [
          { id: "a1", filename: "photo.jpg", path: "s3://photo", content_type: "image/jpeg" },
          { id: "a2" },
        ],
      }),
    ).toEqual({
      id: "q1",
      type: "text",
      text: "",
      answer: true,
      notes: "review note",
      attachments: [
        { id: "a1", name: "photo.jpg", url: "s3://photo", mime: "image/jpeg" },
        { id: "a2", name: "Attachment", url: "", mime: null },
      ],
      code: "CODE-1",
      order: 3,
    });
    expect(mapAuditQuestionDTO({ id: "q2", attachments: null as never })).not.toHaveProperty("code");
  });

  it.each(["high", "MEDIUM", "Low", "unknown", null])(
    "maps report severity %j and numeric values",
    (severity) => {
      const result = mapAuditReportItemDTO({
        id: "item",
        title: null,
        severity,
        photos: ["valid.jpg", 1 as never, "also-valid.png"],
        quantity: "2.5",
        unitPrice: 4,
        total: "invalid",
      });
      expect(result.severity).toBe(
        ["high", "medium", "low"].includes(String(severity).toLowerCase())
          ? String(severity).toLowerCase()
          : "low",
      );
      expect(result).toMatchObject({
        title: "",
        photos: ["valid.jpg", "also-valid.png"],
        quantity: 2.5,
        unitPrice: 4,
        total: 10,
      });
    },
  );

  it("maps comments with aliases and optional page", () => {
    expect(
      mapAuditCommentDTO({
        id: "c1",
        report_item_id: "item-1",
        text: "Comment",
        page: "3",
        createdAt: "2026-01-01",
        user: "Reviewer",
      }),
    ).toEqual({
      id: "c1",
      itemId: "item-1",
      text: "Comment",
      page: 3,
      createdAt: "2026-01-01",
      author: "Reviewer",
    });
    expect(mapAuditCommentDTO({ id: "c2", page: null })).toEqual({
      id: "c2",
      itemId: "",
      text: "",
      createdAt: "",
      author: "",
    });
  });

  it("maps a complete detail from steps and answers", () => {
    const result = mapAuditDetailDTOToDomain({
      id: "audit-1",
      flowId: "flow-1",
      flow_name: "Safety",
      flowVersion: 2,
      projectId: " project-1 ",
      facilityId: " ",
      status: "completed",
      project_name: "Project",
      auditor: "Auditor",
      facility_name: "Facility",
      created_at: "2026-01-01",
      updated_at: "2026-01-02",
      completedDate: "2026-01-03",
      answers: [
        { step_id: "location", type: "form", values: { location: " Warehouse " } },
        { step_id: "q1", type: "question", answer: "YES", values: { notes: "note", photos: ["a/b.jpg", "", 3] } },
        { step_id: "q2", type: "form", values: { measurements: 12, comments: "measured" } },
        { step_id: "q3", type: "form", values: { quantity: 5 } },
      ],
      steps: [
        { id: "q1", type: "Question", text: "Guard?" },
        { id: "q2", type: "number", title: "Length" },
        { id: "q3", type: "number", title: "Count" },
        { id: "q4", type: "text", answer: { step_id: "q4", type: "text", values: { answer: "inline" } } },
      ],
      reportItems: [{ id: "r1", quantity: 2, unit_price: 3 }],
      comments: [{ id: "c1" }],
    });

    expect(result).toMatchObject({
      id: "audit-1",
      flowId: "flow-1",
      version: 2,
      projectId: "project-1",
      facilityId: null,
      auditorName: "Auditor",
      location: "Warehouse",
      status: "completed",
      auditDate: "2026-01-01",
      completedDate: "2026-01-03",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-02",
    });
    expect(result.questions.map((question) => question.answer)).toEqual([true, 12, 5, "inline"]);
    expect(result.questions[0]?.attachments).toEqual([
      { id: "q1-0", name: "b.jpg", url: "a/b.jpg", mime: null },
    ]);
    expect(result.reportItems[0]?.total).toBe(6);
    expect(result.steps).toHaveLength(4);
  });

  it("falls back to DTO questions and alternative location", () => {
    const result = mapAuditDetailDTOToDomain({
      id: "audit-2",
      flow_id: "flow-2",
      project_id: "",
      facility_id: null,
      status: "future_status",
      auditDate: "2026-02-01",
      completed_date: null,
      answers: [
        { step_id: "x", type: "question", values: { location: " Secondary " } },
      ],
      questions: [{ id: "q", type: "select", answer: "Choice" }],
      report_items: null as never,
      comments: null as never,
    });

    expect(result).toMatchObject({
      flowId: "flow-2",
      version: 1,
      projectId: null,
      facilityId: null,
      location: "Secondary",
      // Unrecognised states fall back instead of being cast through.
      status: "draft_report_pending_review",
      completedDate: null,
      createdAt: null,
      updatedAt: null,
      reportItems: [],
      comments: [],
    });
    expect(result.questions).toHaveLength(1);
  });

  it("handles an empty detail and missing collections", () => {
    const result = mapAuditDetailDTOToDomain({ id: "audit-3", status: "" });
    expect(result).toMatchObject({
      flowId: "",
      version: 1,
      location: null,
      status: "draft_report_pending_review",
      auditDate: "",
      completedDate: null,
      questions: [],
      reportItems: [],
      comments: [],
    });
  });
});
