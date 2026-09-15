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
    answer: "YES",
    quantity: 1,
    cost: 10,
    total_cost: 10,
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
  it("maps every snake_case field to camelCase", () => {
    const dto = makeFindingDTO({
      question_code: "Q-42",
      answer: "NO",
      barrier_statement: "Step is too high",
      mitigation_statement: "Install a ramp",
      code_reference: "ADAS 4.8",
      quantity: 2,
      cost: 150.5,
      unit: "ea",
      total_cost: 301,
      notes: "Measured twice",
      photos: ["a.jpg"],
      include_in_report: true,
      calculated_cost: 300,
    });

    expect(mapAuditFindingDTO(dto)).toEqual({
      questionCode: "Q-42",
      answer: "NO",
      barrierStatement: "Step is too high",
      proposedMitigation: "Install a ramp",
      adasReference: "ADAS 4.8",
      quantity: 2,
      cost: 150.5,
      unit: "ea",
      totalCost: 301,
      notes: "Measured twice",
      photos: ["a.jpg"],
      includeInReport: true,
      calculatedCost: 300,
    });
  });

  it("applies defaults when the optional fields are absent", () => {
    const result = mapAuditFindingDTO(makeFindingDTO());

    expect(result.barrierStatement).toBeNull();
    expect(result.proposedMitigation).toBeNull();
    expect(result.adasReference).toBeNull();
    expect(result.unit).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.photos).toEqual([]);
    expect(result.includeInReport).toBe(false);
    expect(result.calculatedCost).toBe(0);
  });

  it("applies the same defaults when the optional fields are null", () => {
    const result = mapAuditFindingDTO(
      makeFindingDTO({
        barrier_statement: null,
        mitigation_statement: null,
        code_reference: null,
        unit: null,
        notes: null,
        photos: null,
      })
    );

    expect(result.barrierStatement).toBeNull();
    expect(result.proposedMitigation).toBeNull();
    expect(result.adasReference).toBeNull();
    expect(result.unit).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.photos).toEqual([]);
  });

  it("keeps numeric zeros for quantity, cost and total_cost", () => {
    const result = mapAuditFindingDTO(
      makeFindingDTO({ quantity: 0, cost: 0, total_cost: 0, calculated_cost: 0 })
    );

    expect(result.quantity).toBe(0);
    expect(result.cost).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.calculatedCost).toBe(0);
  });

  it("parses numeric strings coming from the backend", () => {
    const result = mapAuditFindingDTO(
      makeFindingDTO({
        quantity: "3" as never,
        cost: "12.5" as never,
        total_cost: "37.5" as never,
      })
    );

    expect(result.quantity).toBe(3);
    expect(result.cost).toBe(12.5);
    expect(result.totalCost).toBe(37.5);
  });

  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["non numeric string", "abc"],
    ["blank string", "   "],
    ["null", null],
    ["undefined", undefined],
  ])("falls back to 0 when quantity is %s", (_label, value) => {
    expect(mapAuditFindingDTO(makeFindingDTO({ quantity: value as never })).quantity).toBe(
      0
    );
  });

  it.each([
    ["boolean true", true, true],
    ["boolean false", false, false],
    ['string "true"', "true", true],
    ['string "TRUE"', "TRUE", true],
    ['string "false"', "false", false],
    ['string "yes"', "yes", false],
    ["number 1", 1, true],
    ["number 0", 0, false],
    ["null", null, false],
    ["undefined", undefined, false],
  ])("maps include_in_report %s to %s", (_label, value, expected) => {
    expect(
      mapAuditFindingDTO(makeFindingDTO({ include_in_report: value as never }))
        .includeInReport
    ).toBe(expected);
  });

  it("never populates qcComment or updatedAt from the DTO", () => {
    const result = mapAuditFindingDTO(
      makeFindingDTO({
        qc_comment: "reviewer note",
        updated_at: "2026-01-03T00:00:00Z",
      } as never)
    );

    // El finding no tiene qcComment ni updatedAt: el backend no los expone en
    // su FindingDetail, así que declararlos en el dominio era superficie
    // muerta que aparentaba traer datos. El comentario de QC viaja en `notes`.
    expect(result).not.toHaveProperty("qcComment");
    expect(result).not.toHaveProperty("updatedAt");
  });
});

// ---------------------------------------------------------------------------
// mapAuditReviewDTO
// ---------------------------------------------------------------------------

describe("mapAuditReviewDTO", () => {
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
