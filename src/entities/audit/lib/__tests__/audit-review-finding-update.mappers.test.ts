import { describe, expect, it } from "vitest";
import {
  mapAuditFindingUpdateResponseDTOToDomain,
  mapUpdateAuditFindingInputToDTO,
} from "../audit-review-finding-update.mappers";

describe("mapUpdateAuditFindingInputToDTO", () => {
  it("sends nothing when the input carries no change", () => {
    expect(mapUpdateAuditFindingInputToDTO({} as never)).toEqual({});
  });

  it("copies the version, the quantity and the trimmed notes", () => {
    expect(
      mapUpdateAuditFindingInputToDTO({
        expectedVersion: 3,
        quantity: 2,
        notes: "  Broken handrail  ",
      } as never),
    ).toEqual({ expected_version: 3, quantity: 2, notes: "Broken handrail" });
  });

  it("turns blank notes into an explicit null", () => {
    expect(mapUpdateAuditFindingInputToDTO({ notes: "   " } as never)).toEqual({ notes: null });
    expect(mapUpdateAuditFindingInputToDTO({ notes: null } as never)).toEqual({ notes: null });
  });

  it("drops a quantity that is not a finite number", () => {
    expect(mapUpdateAuditFindingInputToDTO({ quantity: Number.NaN } as never)).toEqual({});
    expect(mapUpdateAuditFindingInputToDTO({ quantity: "2" } as never)).toEqual({});
  });

  it("drops a version that is not a number", () => {
    expect(mapUpdateAuditFindingInputToDTO({ expectedVersion: "3" } as never)).toEqual({});
  });

  it("keeps only the photos that carry a url", () => {
    expect(
      mapUpdateAuditFindingInputToDTO({
        photos: [
          { url: "  https://cdn.example/a.png  ", includeInReport: true },
          { url: "https://cdn.example/b.png" },
          { url: "   " },
          { url: 42 },
          {},
        ],
      } as never),
    ).toEqual({
      photos: [
        { url: "https://cdn.example/a.png", include_in_report: true },
        { url: "https://cdn.example/b.png" },
      ],
    });
  });

  it("ignores a photos field that is not an array", () => {
    expect(mapUpdateAuditFindingInputToDTO({ photos: "none" } as never)).toEqual({});
  });
});

describe("mapAuditFindingUpdateResponseDTOToDomain", () => {
  it("copies every field", () => {
    expect(
      mapAuditFindingUpdateResponseDTOToDomain({
        audit_id: "a1",
        question_code: "Q1",
        status: "updated",
        message: "ok",
      }),
    ).toEqual({ auditId: "a1", questionCode: "Q1", status: "updated", message: "ok" });
  });

  it("defaults a missing message to an empty string", () => {
    expect(
      mapAuditFindingUpdateResponseDTOToDomain({ audit_id: "a1", question_code: "Q1", status: "updated" }),
    ).toMatchObject({ message: "" });
  });
});
