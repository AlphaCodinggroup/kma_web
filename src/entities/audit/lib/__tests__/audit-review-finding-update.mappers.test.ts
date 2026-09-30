// ---------------------------------------------------------------------------
// Tests for the audit finding update mappers (domain -> DTO and back)
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
  mapUpdateAuditFindingInputToDTO,
  mapAuditFindingUpdateResponseDTOToDomain,
} from "../audit-review-finding-update.mappers";
import type { UpdateAuditFindingInput } from "@entities/audit/model/audit-review-finding-update";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Input minimo: solo los identificadores, que nunca viajan en el body. */
function makeInput(
  overrides: Partial<UpdateAuditFindingInput> = {}
): UpdateAuditFindingInput {
  return {
    auditId: "audit-1",
    questionCode: "Q1",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// mapUpdateAuditFindingInputToDTO
// ---------------------------------------------------------------------------

describe("mapUpdateAuditFindingInputToDTO", () => {
  it("returns an empty payload when nothing is being updated", () => {
    expect(mapUpdateAuditFindingInputToDTO(makeInput())).toEqual({});
  });

  it("never sends auditId or questionCode in the body", () => {
    const dto = mapUpdateAuditFindingInputToDTO(makeInput({ quantity: 1 }));

    expect(dto).not.toHaveProperty("audit_id");
    expect(dto).not.toHaveProperty("question_code");
  });

  it("maps a full input", () => {
    const dto = mapUpdateAuditFindingInputToDTO(
      makeInput({
        quantity: 4,
        notes: "  needs rework  ",
        photos: [
          { url: "https://cdn/a.jpg", includeInReport: true },
          { url: "https://cdn/b.jpg", includeInReport: false },
        ],
      })
    );

    expect(dto).toEqual({
      quantity: 4,
      notes: "needs rework",
      photos: [
        { url: "https://cdn/a.jpg", include_in_report: true },
        { url: "https://cdn/b.jpg", include_in_report: false },
      ],
    });
  });

  it("sends quantity 0 instead of treating it as absent", () => {
    expect(mapUpdateAuditFindingInputToDTO(makeInput({ quantity: 0 }))).toEqual({
      quantity: 0,
    });
  });

  // null vacía la cantidad: descartarlo hacía imposible borrarla, porque el
  // backend interpreta la ausencia como "no cambies este campo".
  it("sends a null quantity so it can be cleared", () => {
    expect(mapUpdateAuditFindingInputToDTO(makeInput({ quantity: null }))).toEqual(
      { quantity: null }
    );
  });

  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
  ])("drops a non-finite quantity (%s)", (_label, value) => {
    expect(
      mapUpdateAuditFindingInputToDTO(makeInput({ quantity: value }))
    ).toEqual({});
  });

  it.each([
    ["a blank string", "   ", null],
    ["an empty string", "", null],
    ["an explicit null", null, null],
  ])("normalizes notes %s to null", (_label, value, expected) => {
    expect(mapUpdateAuditFindingInputToDTO(makeInput({ notes: value }))).toEqual({
      notes: expected,
    });
  });

  it("omits the notes key when notes is undefined", () => {
    expect(mapUpdateAuditFindingInputToDTO(makeInput())).not.toHaveProperty(
      "notes"
    );
  });

  it("sends an empty photo array when photos is an empty array", () => {
    expect(mapUpdateAuditFindingInputToDTO(makeInput({ photos: [] }))).toEqual({
      photos: [],
    });
  });

  it("omits the photos key when photos is undefined", () => {
    expect(mapUpdateAuditFindingInputToDTO(makeInput())).not.toHaveProperty(
      "photos"
    );
  });

  it("filters out photos without a usable url", () => {
    const dto = mapUpdateAuditFindingInputToDTO(
      makeInput({
        photos: [
          { url: "  " },
          { url: "" },
          { url: "https://cdn/ok.jpg" },
        ],
      })
    );

    expect(dto.photos).toEqual([{ url: "https://cdn/ok.jpg" }]);
  });

  it.each([
    ["a null url", null],
    ["a numeric url", 42],
    ["a missing url", undefined],
  ])("filters out a photo with %s", (_label, url) => {
    const dto = mapUpdateAuditFindingInputToDTO(
      makeInput({ photos: [{ url } as never] })
    );

    expect(dto.photos).toEqual([]);
  });

  it("trims photo urls", () => {
    const dto = mapUpdateAuditFindingInputToDTO(
      makeInput({ photos: [{ url: "  https://cdn/a.jpg  " }] })
    );

    expect(dto.photos).toEqual([{ url: "https://cdn/a.jpg" }]);
  });

  it("omits include_in_report when includeInReport is not a boolean", () => {
    const dto = mapUpdateAuditFindingInputToDTO(
      makeInput({ photos: [{ url: "https://cdn/a.jpg" }] })
    );

    expect(dto.photos?.[0]).not.toHaveProperty("include_in_report");
  });

  it("keeps include_in_report false", () => {
    const dto = mapUpdateAuditFindingInputToDTO(
      makeInput({
        photos: [{ url: "https://cdn/a.jpg", includeInReport: false }],
      })
    );

    expect(dto.photos?.[0]).toEqual({
      url: "https://cdn/a.jpg",
      include_in_report: false,
    });
  });
});

// ---------------------------------------------------------------------------
// mapAuditFindingUpdateResponseDTOToDomain
// ---------------------------------------------------------------------------

describe("mapAuditFindingUpdateResponseDTOToDomain", () => {
  it("maps the snake_case response to the domain shape", () => {
    expect(
      mapAuditFindingUpdateResponseDTOToDomain({
        audit_id: "audit-1",
        question_code: "Q1",
        status: "updated",
        message: "Finding updated",
      })
    ).toEqual({
      auditId: "audit-1",
      questionCode: "Q1",
      status: "updated",
      message: "Finding updated",
    });
  });

  it("defaults the message to an empty string when it is absent", () => {
    const result = mapAuditFindingUpdateResponseDTOToDomain({
      audit_id: "a",
      question_code: "Q",
      status: "ok",
    });

    expect(result.message).toBe("");
  });

  it("defaults the message to an empty string when it is null", () => {
    const result = mapAuditFindingUpdateResponseDTOToDomain({
      audit_id: "a",
      question_code: "Q",
      status: "ok",
      message: null,
    });

    expect(result.message).toBe("");
  });
});
