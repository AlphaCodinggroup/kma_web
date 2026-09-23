// ---------------------------------------------------------------------------
// Tests for the audit review (QC) mappers
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
  mapAuditFindingDTO,
  mapAuditReviewDTO,
  type AuditFindingDTO,
  type AuditReviewDTO,
} from "../audit-review.mappers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Finding minimo: solo los campos requeridos por el DTO. */
function makeFindingDTO(
  overrides: Partial<AuditFindingDTO> = {}
): AuditFindingDTO {
  return {
    question_code: "Q1",
    answer: "NO",
    ...overrides,
  };
}

/** Review minima con una lista de findings vacia. */
function makeReviewDTO(overrides: Partial<AuditReviewDTO> = {}): AuditReviewDTO {
  return {
    audit_id: "audit-1",
    flow_id: "flow-1",
    project_id: "project-1",
    status: "draft_report_in_review",
    findings: [],
    total_cost: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// mapAuditFindingDTO
// ---------------------------------------------------------------------------

describe("mapAuditFindingDTO", () => {
  it("maps the finding as GET /audits-review returns it", () => {
    const dto = makeFindingDTO({
      question_code: "Q-42",
      answer: "NO",
      mitigation_id: "MIT-1",
      barrier_statement: "Step is too high",
      mitigation_statement: "Install a ramp",
      code_reference: "ADAS 4.8",
      quantity: 2.5,
      unit_cost: 150.5,
      unit_of_measure: "LF",
      measurements: [{ name: "Height", value: 45, unit: "in" }],
      notes: "Measured twice",
      photos: [
        { url: "https://cdn/a.jpg", include_in_report: true },
        { url: "https://cdn/b.jpg", include_in_report: false },
      ],
      calculated_cost: 376.25,
    });

    expect(mapAuditFindingDTO(dto)).toEqual({
      questionCode: "Q-42",
      answer: "NO",
      mitigationId: "MIT-1",
      barrierStatement: "Step is too high",
      proposedMitigation: "Install a ramp",
      adasReference: "ADAS 4.8",
      quantity: 2.5,
      unitCost: 150.5,
      unitOfMeasure: "LF",
      measurements: [{ name: "Height", value: 45, unit: "in" }],
      notes: "Measured twice",
      photos: [
        { url: "https://cdn/a.jpg", includeInReport: true },
        { url: "https://cdn/b.jpg", includeInReport: false },
      ],
      calculatedCost: 376.25,
    });
  });

  it("falls back to the POST /reviews field names", () => {
    const result = mapAuditFindingDTO(
      makeFindingDTO({ cost: 12, unit: "EA", photos: ["https://cdn/a.jpg", " "] })
    );

    expect(result.unitCost).toBe(12);
    expect(result.unitOfMeasure).toBe("EA");
    expect(result.photos).toEqual([{ url: "https://cdn/a.jpg", includeInReport: true }]);
  });

  it("uses null or empty lists when the optional fields are absent", () => {
    expect(mapAuditFindingDTO(makeFindingDTO())).toEqual({
      questionCode: "Q1",
      answer: "NO",
      mitigationId: null,
      barrierStatement: null,
      proposedMitigation: null,
      adasReference: null,
      quantity: null,
      unitCost: null,
      unitOfMeasure: null,
      measurements: [],
      notes: null,
      photos: [],
      calculatedCost: null,
    });
  });

  it("keeps numeric zeros and parses numeric strings", () => {
    const result = mapAuditFindingDTO(
      makeFindingDTO({
        quantity: 0,
        unit_cost: "12.5" as never,
        calculated_cost: 0,
      })
    );

    expect(result.quantity).toBe(0);
    expect(result.unitCost).toBe(12.5);
    expect(result.calculatedCost).toBe(0);
  });

  it.each([
    ["NaN", Number.NaN],
    ["non numeric string", "abc"],
    ["blank string", "   "],
    ["null", null],
  ])("maps a %s quantity to null", (_label, value) => {
    expect(mapAuditFindingDTO(makeFindingDTO({ quantity: value as never })).quantity).toBeNull();
  });

  it("includes a photo in the report unless it says otherwise", () => {
    const result = mapAuditFindingDTO(
      makeFindingDTO({
        photos: [
          { url: "https://cdn/a.jpg" },
          { url: "https://cdn/b.jpg", include_in_report: null },
          { url: "" },
          null as never,
        ],
      })
    );

    expect(result.photos).toEqual([
      { url: "https://cdn/a.jpg", includeInReport: true },
      { url: "https://cdn/b.jpg", includeInReport: true },
    ]);
  });

  it("drops measurements without a numeric value and blank names or units", () => {
    const result = mapAuditFindingDTO(
      makeFindingDTO({
        measurements: [
          { name: "", value: "3.2", unit: " " },
          { name: "Width", value: null },
          null as never,
        ],
      })
    );

    expect(result.measurements).toEqual([{ name: null, value: 3.2, unit: null }]);
  });
});

// ---------------------------------------------------------------------------
// mapAuditReviewDTO
// ---------------------------------------------------------------------------

describe("mapAuditReviewDTO", () => {
  it("defaults a missing project id to an empty string", () => {
    expect(mapAuditReviewDTO({ ...makeReviewDTO(), project_id: undefined as never }).projectId).toBe("");
  });

  it("maps the review envelope and its findings", () => {
    const result = mapAuditReviewDTO(
      makeReviewDTO({
        findings: [makeFindingDTO({ question_code: "Q1" }), makeFindingDTO({ question_code: "Q2" })],
        total_cost: 250,
      })
    );

    expect(result).toEqual({
      auditId: "audit-1",
      flowId: "flow-1",
      projectId: "project-1",
      status: "draft_report_in_review",
      findings: [
        expect.objectContaining({ questionCode: "Q1" }),
        expect.objectContaining({ questionCode: "Q2" }),
      ],
      totalCost: 250,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    });
  });

  it("returns an empty findings list when findings is empty", () => {
    expect(mapAuditReviewDTO(makeReviewDTO()).findings).toEqual([]);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
  ])("returns an empty findings list when findings is %s", (_label, value) => {
    expect(
      mapAuditReviewDTO(makeReviewDTO({ findings: value as never })).findings
    ).toEqual([]);
  });

  it("keeps a total_cost of 0", () => {
    expect(mapAuditReviewDTO(makeReviewDTO({ total_cost: 0 })).totalCost).toBe(0);
  });

  it("falls back to 0 for an unparseable total_cost", () => {
    expect(
      mapAuditReviewDTO(makeReviewDTO({ total_cost: "abc" as never })).totalCost
    ).toBe(0);
  });

  // La lista blanca filtra de verdad: lo que no está en ella cae al estado
  // inicial en vez de entrar al dominio y romper los switches por estado.
  it.each([
    ["an unknown status", "surprise"],
    ["an empty status", ""],
  ])("falls back to the initial status for %s", (_label, status) => {
    expect(mapAuditReviewDTO(makeReviewDTO({ status })).status).toBe(
      "draft_report_pending_review"
    );
  });


  it("does not normalize the created_at / updated_at strings", () => {
    const result = mapAuditReviewDTO(
      makeReviewDTO({ created_at: "not-a-date", updated_at: "" })
    );

    expect(result.createdAt).toBe("not-a-date");
    expect(result.updatedAt).toBe("");
  });
});
