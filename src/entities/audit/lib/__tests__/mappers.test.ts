// ---------------------------------------------------------------------------
// Tests for the audit list mappers (DTO -> domain)
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
  mapAuditDtoToDomain,
  mapAuditsResponseToDomain,
  type AuditDTO,
  type AuditsResponseDTO,
} from "../mappers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Construye un AuditDTO minimo y permite sobreescribir campos puntuales. */
function makeAuditDTO(overrides: Partial<AuditDTO> = {}): AuditDTO {
  return {
    id: "audit-1",
    flow_id: "flow-1",
    status: "completed",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// mapAuditDtoToDomain
// ---------------------------------------------------------------------------

describe("mapAuditDtoToDomain", () => {
  it("maps every snake_case field to its camelCase counterpart", () => {
    const dto = makeAuditDTO({
      id: "a-1",
      flow_id: "f-1",
      flow_name: "Ramps",
      flow_version: 3,
      project_id: "p-1",
      facility_id: "fa-1",
      status: "draft_report_in_review",
      created_by: "user-1",
      updated_by: "user-2",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
      project_name: "Project One",
      auditor_name: "Jane",
      facility_name: "Facility One",
      findings_count: 7,
    });

    expect(mapAuditDtoToDomain(dto)).toEqual({
      id: "a-1",
      flowId: "f-1",
      flowName: "Ramps",
      version: 3,
      projectId: "p-1",
      projectName: "Project One",
      facilityId: "fa-1",
      status: "draft_report_in_review",
      createdBy: "user-1",
      updatedBy: "user-2",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      auditorName: "Jane",
      facilityName: "Facility One",
      findingsCount: 7,
    });
  });

  it("applies defaults when all optional fields are absent", () => {
    const result = mapAuditDtoToDomain(makeAuditDTO());

    expect(result.flowName).toBeNull();
    expect(result.version).toBe(1);
    expect(result.projectId).toBeNull();
    expect(result.facilityId).toBeNull();
    expect(result.createdBy).toBeNull();
    expect(result.updatedBy).toBeNull();
    expect(result.createdAt).toBe("");
    expect(result.updatedAt).toBe("");
    expect(result.findingsCount).toBeNull();
    // FIXME: el modelo declara projectName/auditorName/facilityName como
    // `string | null`; el mapper devuelve "" en lugar de null cuando faltan,
    // lo que obliga a la UI a chequear ambos valores vacios.
    expect(result.projectName).toBe("");
    expect(result.auditorName).toBe("");
    expect(result.facilityName).toBe("");
  });

  it("applies the same defaults when optional fields are explicitly null", () => {
    const result = mapAuditDtoToDomain(
      makeAuditDTO({
        flow_name: null,
        project_id: null,
        facility_id: null,
        created_by: null,
        updated_by: null,
        created_at: null,
        updated_at: null,
        project_name: null,
        auditor_name: null,
        facility_name: null,
        findings_count: null,
      })
    );

    expect(result.flowName).toBeNull();
    expect(result.projectId).toBeNull();
    expect(result.facilityId).toBeNull();
    expect(result.createdAt).toBe("");
    expect(result.findingsCount).toBeNull();
    expect(result.projectName).toBe("");
  });

  it("keeps numeric zero for findings_count instead of treating it as absent", () => {
    const result = mapAuditDtoToDomain(makeAuditDTO({ findings_count: 0 }));

    expect(result.findingsCount).toBe(0);
  });

  it("keeps flow_version 0 instead of falling back to 1", () => {
    const result = mapAuditDtoToDomain(makeAuditDTO({ flow_version: 0 }));

    expect(result.version).toBe(0);
  });

  it.each([
    ["empty string", ""],
    ["only spaces", "   "],
    ["tabs and newlines", " \t\n "],
  ])("normalizes a blank project_id (%s) to null", (_label, value) => {
    const result = mapAuditDtoToDomain(makeAuditDTO({ project_id: value }));

    expect(result.projectId).toBeNull();
  });

  it("trims non-blank ids", () => {
    const result = mapAuditDtoToDomain(
      makeAuditDTO({ project_id: "  p-1  ", facility_id: "  fa-1  " })
    );

    expect(result.projectId).toBe("p-1");
    expect(result.facilityId).toBe("fa-1");
  });

  it("passes through an invalid date string without validating it", () => {
    const result = mapAuditDtoToDomain(
      makeAuditDTO({ created_at: "not-a-date", updated_at: "2026-13-45" })
    );

    // FIXME: no hay validacion de fecha; un valor invalido llega tal cual al
    // dominio y solo falla al renderizarse. Deberia normalizarse a null o "".
    expect(result.createdAt).toBe("not-a-date");
    expect(result.updatedAt).toBe("2026-13-45");
  });

  it("trims surrounding whitespace on dates", () => {
    const result = mapAuditDtoToDomain(
      makeAuditDTO({ created_at: "  2026-01-01T00:00:00Z  " })
    );

    expect(result.createdAt).toBe("2026-01-01T00:00:00Z");
  });

  it("casts an unknown status without validating the allowed values", () => {
    const result = mapAuditDtoToDomain(makeAuditDTO({ status: "weird_status" }));

    // FIXME: el mapper castea cualquier string a AuditStatus; un estado
    // desconocido del backend entra al dominio sin senalizarse.
    expect(result.status).toBe("weird_status");
  });

  it("maps an empty status to an empty string", () => {
    const result = mapAuditDtoToDomain(makeAuditDTO({ status: "" }));

    expect(result.status).toBe("");
  });

  it("defends against a missing flow_id and status at runtime", () => {
    const result = mapAuditDtoToDomain({ id: "a-1" } as never);

    expect(result.flowId).toBe("");
    expect(result.status).toBe("");
  });
});

// ---------------------------------------------------------------------------
// mapAuditsResponseToDomain
// ---------------------------------------------------------------------------

describe("mapAuditsResponseToDomain", () => {
  it("maps every item of the list", () => {
    const res: AuditsResponseDTO = {
      audits: [
        makeAuditDTO({ id: "a-1" }),
        makeAuditDTO({ id: "a-2", findings_count: 2 }),
      ],
    };

    const result = mapAuditsResponseToDomain(res);

    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("a-1");
    expect(result[1]?.findingsCount).toBe(2);
  });

  it("returns an empty array for an empty list", () => {
    expect(mapAuditsResponseToDomain({ audits: [] })).toEqual([]);
  });

  it.each([
    ["null response", null],
    ["undefined response", undefined],
    ["missing audits key", {}],
    ["audits is not an array", { audits: "nope" }],
  ])("returns an empty array for %s", (_label, input) => {
    expect(mapAuditsResponseToDomain(input as never)).toEqual([]);
  });
});
