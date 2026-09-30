// ---------------------------------------------------------------------------
// Tests for the audit detail mappers (DTO -> domain)
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
  mapAuditQuestionDTO,
  mapAuditReportItemDTO,
  mapAuditCommentDTO,
  mapAuditDetailDTOToDomain,
  type AuditDetailDTO,
  type AuditQuestionDTO,
  type AuditReportItemDTO,
  type AuditCommentDTO,
} from "../audit-detail.mappers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Construye el DTO de detalle con los campos obligatorios ya resueltos. */
function makeDetailDTO(
  overrides: Partial<AuditDetailDTO> = {}
): AuditDetailDTO {
  return {
    id: "audit-1",
    status: "completed",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// mapAuditQuestionDTO
// ---------------------------------------------------------------------------

describe("mapAuditQuestionDTO", () => {
  it("maps a full question DTO", () => {
    const dto: AuditQuestionDTO = {
      id: "q-1",
      type: "yes_no",
      text: "Is the ramp compliant?",
      answer: "YES",
      notes: "Looks good",
      order: 2,
      code: "Q1",
      attachments: [
        {
          id: "att-1",
          name: "photo.jpg",
          url: "https://cdn/photo.jpg",
          mime: "image/jpeg",
        },
      ],
    };

    expect(mapAuditQuestionDTO(dto)).toEqual({
      id: "q-1",
      type: "yes_no",
      text: "Is the ramp compliant?",
      answer: true,
      notes: "Looks good",
      attachments: [
        {
          id: "att-1",
          name: "photo.jpg",
          url: "https://cdn/photo.jpg",
          mime: "image/jpeg",
        },
      ],
      code: "Q1",
      order: 2,
    });
  });

  it("falls back to defaults when everything optional is missing", () => {
    const result = mapAuditQuestionDTO({ id: "q-1" });

    expect(result).toEqual({
      id: "q-1",
      type: "text",
      text: "",
      answer: null,
      notes: null,
      attachments: [],
    });
    expect(result).not.toHaveProperty("code");
    expect(result).not.toHaveProperty("order");
  });

  it.each([
    ["yes_no", "yes_no"],
    ["question", "yes_no"],
    ["multiple_choice", "multiple_choice"],
    ["select", "multiple_choice"],
    ["number", "number"],
    ["text", "text"],
    ["form", "text"],
    ["YES_NO", "yes_no"],
    ["unknown-type", "text"],
    ["", "text"],
  ])("normalizes the raw type %s to %s", (raw, expected) => {
    expect(mapAuditQuestionDTO({ id: "q", type: raw }).type).toBe(expected);
  });

  it.each([
    ["YES", true],
    ["yes", true],
    ["SI", true],
    ["si", true],
    ["TRUE", true],
    [" true ", true],
    ["NO", false],
    ["no", false],
    ["FALSE", false],
    ["maybe", "maybe"],
  ])("normalizes the string answer %s", (raw, expected) => {
    expect(mapAuditQuestionDTO({ id: "q", answer: raw }).answer).toBe(expected);
  });

  it("keeps a boolean answer untouched", () => {
    expect(mapAuditQuestionDTO({ id: "q", answer: true }).answer).toBe(true);
    expect(mapAuditQuestionDTO({ id: "q", answer: false }).answer).toBe(false);
  });

  it("keeps the numeric answer 0 instead of treating it as absent", () => {
    expect(mapAuditQuestionDTO({ id: "q", answer: 0 }).answer).toBe(0);
  });

  it("maps a null answer to null", () => {
    expect(mapAuditQuestionDTO({ id: "q", answer: null }).answer).toBeNull();
  });

  it("uses response as the fallback when answer is absent", () => {
    expect(mapAuditQuestionDTO({ id: "q", response: "NO" }).answer).toBe(false);
  });

  it("prefers answer over response when both are present", () => {
    expect(
      mapAuditQuestionDTO({ id: "q", answer: "YES", response: "NO" }).answer
    ).toBe(true);
  });

  it("uses comments as the fallback for notes", () => {
    expect(mapAuditQuestionDTO({ id: "q", comments: "from comments" }).notes).toBe(
      "from comments"
    );
  });

  it("uses question_code as the fallback for code", () => {
    expect(mapAuditQuestionDTO({ id: "q", question_code: "QC-1" }).code).toBe(
      "QC-1"
    );
  });

  // Un código vacío es un código presente y vacío: descartarlo lo volvía
  // indistinguible de "sin código".
  it("keeps an empty code", () => {
    expect(mapAuditQuestionDTO({ id: "q", code: "" }).code).toBe("");
  });

  it("omits the code when the DTO has none", () => {
    expect(mapAuditQuestionDTO({ id: "q" })).not.toHaveProperty("code");
  });

  it("keeps order 0 because the mapper checks the type, not truthiness", () => {
    expect(mapAuditQuestionDTO({ id: "q", order: 0 }).order).toBe(0);
  });

  it("returns an empty attachment list when attachments is not an array", () => {
    expect(mapAuditQuestionDTO({ id: "q" }).attachments).toEqual([]);
    expect(
      mapAuditQuestionDTO({ id: "q", attachments: [] }).attachments
    ).toEqual([]);
  });

  it("applies attachment fallbacks (filename, path, content_type)", () => {
    const result = mapAuditQuestionDTO({
      id: "q",
      attachments: [
        {
          id: "att-1",
          filename: "legacy.png",
          path: "/files/legacy.png",
          content_type: "image/png",
        },
      ],
    });

    expect(result.attachments[0]).toEqual({
      id: "att-1",
      name: "legacy.png",
      url: "/files/legacy.png",
      mime: "image/png",
    });
  });

  it("uses hardcoded defaults for an attachment with no name or url", () => {
    const result = mapAuditQuestionDTO({
      id: "q",
      attachments: [{ id: "att-1" }],
    });

    expect(result.attachments[0]).toEqual({
      id: "att-1",
      name: "Attachment",
      url: "",
      mime: null,
    });
  });
});

// ---------------------------------------------------------------------------
// mapAuditReportItemDTO
// ---------------------------------------------------------------------------

describe("mapAuditReportItemDTO", () => {
  it("maps a full report item", () => {
    const dto: AuditReportItemDTO = {
      id: "ri-1",
      title: "Missing handrail",
      severity: "HIGH",
      photos: ["a.jpg", "b.jpg"],
      quantity: 2,
      unit_price: 50,
      total: 100,
    };

    expect(mapAuditReportItemDTO(dto)).toEqual({
      id: "ri-1",
      title: "Missing handrail",
      severity: "high",
      photos: ["a.jpg", "b.jpg"],
      quantity: 2,
      unitPrice: 50,
      total: 100,
    });
  });

  it("uses defaults when everything optional is missing", () => {
    expect(mapAuditReportItemDTO({ id: "ri-1" })).toEqual({
      id: "ri-1",
      title: "",
      severity: "low",
      photos: [],
      quantity: 0,
      unitPrice: 0,
      total: 0,
    });
  });

  it.each([
    ["high", "high"],
    ["HIGH", "high"],
    ["medium", "medium"],
    ["low", "low"],
    ["critical", "low"],
    ["", "low"],
  ])("normalizes the severity %s to %s", (raw, expected) => {
    expect(mapAuditReportItemDTO({ id: "ri", severity: raw }).severity).toBe(
      expected
    );
  });

  it("maps a null severity to low", () => {
    expect(mapAuditReportItemDTO({ id: "ri", severity: null }).severity).toBe(
      "low"
    );
  });

  it("parses numeric strings for quantity, unit_price and total", () => {
    const result = mapAuditReportItemDTO({
      id: "ri",
      quantity: "3",
      unit_price: "10.5",
      total: "31.5",
    });

    expect(result.quantity).toBe(3);
    expect(result.unitPrice).toBe(10.5);
    expect(result.total).toBe(31.5);
  });

  it("derives total from quantity * unitPrice when total is absent", () => {
    const result = mapAuditReportItemDTO({
      id: "ri",
      quantity: 4,
      unit_price: 25,
    });

    expect(result.total).toBe(100);
  });

  it("keeps an explicit total of 0 instead of deriving it", () => {
    const result = mapAuditReportItemDTO({
      id: "ri",
      quantity: 4,
      unit_price: 25,
      total: 0,
    });

    expect(result.total).toBe(0);
  });

  it("derives total when total is null", () => {
    const result = mapAuditReportItemDTO({
      id: "ri",
      quantity: 2,
      unit_price: 3,
      total: null,
    });

    expect(result.total).toBe(6);
  });

  it("uses unitPrice (camelCase) as the fallback for unit_price", () => {
    expect(mapAuditReportItemDTO({ id: "ri", unitPrice: 12 }).unitPrice).toBe(12);
  });

  it("prefers unit_price 0 over the camelCase variant", () => {
    const result = mapAuditReportItemDTO({
      id: "ri",
      unit_price: 0,
      unitPrice: 99,
    });

    expect(result.unitPrice).toBe(0);
  });

  it("falls back to 0 when the numeric value is not parseable", () => {
    const result = mapAuditReportItemDTO({
      id: "ri",
      quantity: "abc",
      unit_price: "   ",
    });

    expect(result.quantity).toBe(0);
    expect(result.unitPrice).toBe(0);
  });

  it("drops non-string entries from photos", () => {
    const result = mapAuditReportItemDTO({
      id: "ri",
      photos: ["ok.jpg", 42, null, "fine.png"] as never,
    });

    expect(result.photos).toEqual(["ok.jpg", "fine.png"]);
  });

  it("returns an empty photo list when photos is null", () => {
    expect(mapAuditReportItemDTO({ id: "ri", photos: null }).photos).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// mapAuditCommentDTO
// ---------------------------------------------------------------------------

describe("mapAuditCommentDTO", () => {
  it("maps a full comment", () => {
    const dto: AuditCommentDTO = {
      id: "c-1",
      item_id: "ri-1",
      text: "Please review",
      page: 3,
      created_at: "2026-01-01T00:00:00Z",
      author: "Jane",
    };

    expect(mapAuditCommentDTO(dto)).toEqual({
      id: "c-1",
      itemId: "ri-1",
      text: "Please review",
      page: 3,
      createdAt: "2026-01-01T00:00:00Z",
      author: "Jane",
    });
  });

  it("omits the page key when page is absent or null", () => {
    expect(mapAuditCommentDTO({ id: "c-1" })).not.toHaveProperty("page");
    expect(mapAuditCommentDTO({ id: "c-1", page: null })).not.toHaveProperty(
      "page"
    );
  });

  it("keeps page 0 instead of treating it as absent", () => {
    expect(mapAuditCommentDTO({ id: "c-1", page: 0 }).page).toBe(0);
  });

  it("parses a numeric string page", () => {
    expect(mapAuditCommentDTO({ id: "c-1", page: "5" }).page).toBe(5);
  });

  // Una página no parseable se omite: convertirla en 0 la hacía pasar por una
  // página válida y el comentario quedaba anclado a la primera hoja.
  it.each([
    ["an unparseable page", "abc"],
    ["an empty page", ""],
  ])("omits %s", (_label, page) => {
    expect(mapAuditCommentDTO({ id: "c-1", page })).not.toHaveProperty("page");
  });

  it.each([
    ["item_id", { item_id: "from-snake" }, "from-snake"],
    ["itemId", { itemId: "from-camel" }, "from-camel"],
    ["report_item_id", { report_item_id: "from-report" }, "from-report"],
  ])("resolves itemId from %s", (_label, extra, expected) => {
    expect(mapAuditCommentDTO({ id: "c-1", ...extra }).itemId).toBe(expected);
  });

  it("falls back to an empty itemId when no id variant is present", () => {
    expect(mapAuditCommentDTO({ id: "c-1" }).itemId).toBe("");
  });

  it("uses createdAt (camelCase) as the fallback and user as the author", () => {
    const result = mapAuditCommentDTO({
      id: "c-1",
      createdAt: "2026-02-02T00:00:00Z",
      user: "John",
    });

    expect(result.createdAt).toBe("2026-02-02T00:00:00Z");
    expect(result.author).toBe("John");
  });

  it("defaults createdAt, text and author to empty strings", () => {
    const result = mapAuditCommentDTO({ id: "c-1" });

    expect(result.createdAt).toBe("");
    expect(result.text).toBe("");
    expect(result.author).toBe("");
  });
});

// ---------------------------------------------------------------------------
// mapAuditDetailDTOToDomain
// ---------------------------------------------------------------------------

describe("mapAuditDetailDTOToDomain", () => {
  it("maps snake_case fields to the domain shape", () => {
    const result = mapAuditDetailDTOToDomain(
      makeDetailDTO({
        flow_id: "f-1",
        flow_name: "Ramps",
        flow_version: 4,
        project_id: "p-1",
        facility_id: "fa-1",
        project_name: "Project One",
        auditor_name: "Jane",
        facility_name: "Facility One",
        status: "draft_report_in_review",
        audit_date: "2026-01-01T00:00:00Z",
        completed_date: "2026-01-05T00:00:00Z",
        created_at: "2025-12-31T00:00:00Z",
        updated_at: "2026-01-06T00:00:00Z",
      })
    );

    expect(result.flowId).toBe("f-1");
    expect(result.flowName).toBe("Ramps");
    expect(result.version).toBe(4);
    expect(result.projectId).toBe("p-1");
    expect(result.facilityId).toBe("fa-1");
    expect(result.projectName).toBe("Project One");
    expect(result.auditorName).toBe("Jane");
    expect(result.facilityName).toBe("Facility One");
    expect(result.status).toBe("draft_report_in_review");
    expect(result.auditDate).toBe("2026-01-01T00:00:00Z");
    expect(result.completedDate).toBe("2026-01-05T00:00:00Z");
    expect(result.createdAt).toBe("2025-12-31T00:00:00Z");
    expect(result.updatedAt).toBe("2026-01-06T00:00:00Z");
  });

  it("accepts the camelCase variants of the DTO", () => {
    const result = mapAuditDetailDTOToDomain(
      makeDetailDTO({
        flowId: "f-camel",
        flowVersion: 9,
        projectId: "p-camel",
        facilityId: "fa-camel",
        auditor: "Camel Auditor",
        auditDate: "2026-03-03T00:00:00Z",
        completedDate: "2026-03-04T00:00:00Z",
      })
    );

    expect(result.flowId).toBe("f-camel");
    expect(result.version).toBe(9);
    expect(result.projectId).toBe("p-camel");
    expect(result.facilityId).toBe("fa-camel");
    expect(result.auditorName).toBe("Camel Auditor");
    expect(result.auditDate).toBe("2026-03-03T00:00:00Z");
    expect(result.completedDate).toBe("2026-03-04T00:00:00Z");
  });

  it("applies defaults when everything optional is missing", () => {
    const result = mapAuditDetailDTOToDomain(makeDetailDTO());

    expect(result.flowId).toBe("");
    expect(result.flowName).toBeNull();
    expect(result.version).toBe(1);
    expect(result.projectId).toBeNull();
    expect(result.facilityId).toBeNull();
    expect(result.projectName).toBeNull();
    expect(result.auditorName).toBeNull();
    expect(result.facilityName).toBeNull();
    expect(result.location).toBeNull();
    expect(result.auditDate).toBe("");
    expect(result.completedDate).toBeNull();
    expect(result.createdAt).toBeNull();
    expect(result.updatedAt).toBeNull();
    expect(result.questions).toEqual([]);
    expect(result.reportItems).toEqual([]);
    expect(result.comments).toEqual([]);
    expect(result).not.toHaveProperty("steps");
  });

  it("keeps flow_version 0 instead of falling back to 1", () => {
    expect(mapAuditDetailDTOToDomain(makeDetailDTO({ flow_version: 0 })).version).toBe(
      0
    );
  });

  it("falls back to created_at for auditDate", () => {
    const result = mapAuditDetailDTOToDomain(
      makeDetailDTO({ created_at: "2026-04-04T00:00:00Z" })
    );

    expect(result.auditDate).toBe("2026-04-04T00:00:00Z");
  });

  it.each([
    "draft_report_pending_review",
    "draft_report_in_review",
    "final_report_sent_to_client",
    "completed",
  ])("keeps the known status %s", (status) => {
    expect(mapAuditDetailDTOToDomain(makeDetailDTO({ status })).status).toBe(
      status
    );
  });

  // La lista blanca filtra de verdad: lo que no está en ella cae al estado
  // inicial, en vez de entrar al dominio y romper los switches por estado.
  it.each([
    ["an unknown status", "surprise"],
    ["an empty status", ""],
  ])("falls back to the initial status for %s", (_label, status) => {
    expect(
      mapAuditDetailDTOToDomain(makeDetailDTO({ status })).status
    ).toBe("draft_report_pending_review");
  });

  it("falls back to the initial status when the field is absent", () => {
    // El DTO se arma sin `status`: exactOptionalPropertyTypes no admite
    // pasarlo como undefined explícito.
    const dto = makeDetailDTO({});
    delete (dto as { status?: string }).status;

    expect(mapAuditDetailDTOToDomain(dto).status).toBe(
      "draft_report_pending_review"
    );
  });

  it("normalizes blank ids to null", () => {
    const result = mapAuditDetailDTOToDomain(
      makeDetailDTO({ project_id: "   ", facility_id: "" })
    );

    expect(result.projectId).toBeNull();
    expect(result.facilityId).toBeNull();
  });

  it("builds questions from steps, resolving answers by step_id", () => {
    const result = mapAuditDetailDTOToDomain(
      makeDetailDTO({
        steps: [
          { id: "s-1", type: "Question", text: "Is it compliant?" },
          { id: "s-2", type: "Form", title: "Measurements" },
        ],
        answers: [
          { step_id: "s-1", type: "question", answer: "YES" },
          {
            step_id: "s-2",
            type: "form",
            values: {
              measurements: 12,
              notes: "measured twice",
              photos: ["https://cdn/one.jpg", ""],
            },
          },
        ],
      })
    );

    expect(result.questions).toHaveLength(2);
    expect(result.questions[0]).toEqual({
      id: "s-1",
      type: "yes_no",
      text: "Is it compliant?",
      answer: true,
      notes: null,
      attachments: [],
      code: "s-1",
      order: 1,
    });
    expect(result.questions[1]).toEqual({
      id: "s-2",
      type: "text",
      text: "Measurements",
      answer: 12,
      notes: "measured twice",
      attachments: [
        {
          id: "s-2-0",
          name: "one.jpg",
          url: "https://cdn/one.jpg",
          mime: null,
        },
      ],
      code: "s-2",
      order: 2,
    });
  });

  it("prefers the answer embedded in the step over the answers array", () => {
    const result = mapAuditDetailDTOToDomain(
      makeDetailDTO({
        steps: [
          {
            id: "s-1",
            type: "Question",
            text: "?",
            answer: { step_id: "s-1", type: "question", answer: "NO" },
          },
        ],
        answers: [{ step_id: "s-1", type: "question", answer: "YES" }],
      })
    );

    expect(result.questions[0]?.answer).toBe(false);
  });

  it("resolves the step answer from values.answer and values.quantity", () => {
    const result = mapAuditDetailDTOToDomain(
      makeDetailDTO({
        steps: [
          { id: "s-1", type: "Select", title: "Pick" },
          { id: "s-2", type: "Form", title: "Count" },
        ],
        answers: [
          { step_id: "s-1", type: "select", values: { answer: "Option A" } },
          { step_id: "s-2", type: "form", values: { quantity: 7 } },
        ],
      })
    );

    expect(result.questions[0]?.answer).toBe("Option A");
    expect(result.questions[1]?.answer).toBe(7);
  });

  it("uses questions[] when steps is absent", () => {
    const result = mapAuditDetailDTOToDomain(
      makeDetailDTO({
        questions: [{ id: "q-1", type: "yes_no", text: "From questions" }],
      })
    );

    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]?.text).toBe("From questions");
  });

  // `steps: []` es un array y no es nullish, así que el `??` no caía a
  // `questions`: la auditoría se mostraba sin ninguna pregunta.
  it("uses questions[] when steps is an empty array", () => {
    const result = mapAuditDetailDTOToDomain(
      makeDetailDTO({
        steps: [],
        questions: [{ id: "q-1", type: "yes_no", text: "From questions" }],
      })
    );

    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]?.text).toBe("From questions");
  });

  it("returns an empty list when neither source has questions", () => {
    const result = mapAuditDetailDTOToDomain(
      makeDetailDTO({ steps: [], questions: [] })
    );

    expect(result.questions).toEqual([]);
  });

  it("extracts location from the first form answer", () => {
    const result = mapAuditDetailDTOToDomain(
      makeDetailDTO({
        answers: [
          { step_id: "s-1", type: "question", answer: "YES" },
          { step_id: "s-2", type: "form", values: { location: "  Lobby  " } },
        ],
      })
    );

    expect(result.location).toBe("Lobby");
  });

  it("falls back to any answer carrying values.location", () => {
    const result = mapAuditDetailDTOToDomain(
      makeDetailDTO({
        answers: [
          { step_id: "s-1", type: "select", values: { location: "Parking" } },
        ],
      })
    );

    expect(result.location).toBe("Parking");
  });

  it("returns null location when the form answer has a blank location", () => {
    const result = mapAuditDetailDTOToDomain(
      makeDetailDTO({
        answers: [{ step_id: "s-1", type: "form", values: { location: "   " } }],
      })
    );

    expect(result.location).toBeNull();
  });

  it("returns null location for an empty answers array", () => {
    expect(mapAuditDetailDTOToDomain(makeDetailDTO({ answers: [] })).location).toBeNull();
  });

  it("maps report items from the camelCase key", () => {
    const result = mapAuditDetailDTOToDomain(
      makeDetailDTO({
        reportItems: [{ id: "ri-1", title: "Item", quantity: 1, total: 10 }],
      })
    );

    expect(result.reportItems).toHaveLength(1);
    expect(result.reportItems[0]?.total).toBe(10);
  });

  it("maps comments and keeps the raw steps when present", () => {
    const result = mapAuditDetailDTOToDomain(
      makeDetailDTO({
        steps: [{ id: "s-1", type: "End" }],
        comments: [{ id: "c-1", text: "hi", item_id: "ri-1" }],
      })
    );

    expect(result.comments).toHaveLength(1);
    expect(result.steps).toEqual([{ id: "s-1", type: "End" }]);
  });

  it("returns empty collections when they are not arrays", () => {
    const result = mapAuditDetailDTOToDomain(
      makeDetailDTO({
        report_items: null as never,
        comments: null as never,
      })
    );

    expect(result.reportItems).toEqual([]);
    expect(result.comments).toEqual([]);
  });

  it("maps a null completed_date to null", () => {
    const result = mapAuditDetailDTOToDomain(
      makeDetailDTO({ completed_date: null })
    );

    expect(result.completedDate).toBeNull();
  });
});
