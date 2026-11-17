import { describe, expect, it } from "vitest";
import { mapAuditFindingDTO } from "../audit-review.mappers";

describe("report review contract", () => {
  it("prefers individual photo choices and keeps the stored reference", () => {
    const dto = {
      question_code: "Q1", answer: "NO", mitigation_id: "M2",
      photos: ["https://images.test/photo?temporary=1"],
      photo_details: [{url: "https://images.test/photo?temporary=1", reference: "evidence/photo.jpg", include_in_report: false}],
    };
    const finding = mapAuditFindingDTO(dto);
    expect(finding.mitigationId).toBe("M2");
    expect(finding.photos).toEqual([{url: "https://images.test/photo?temporary=1", reference: "evidence/photo.jpg", includeInReport: false}]);
  });

  it.each([
    [false, null], [true, 0], [undefined, 0],
  ])("distinguishes quantity presence %s", (present, expected) => {
    const dto = {
      question_code: "Q1", answer: "NO", quantity: 0,
      ...(present === undefined ? {} : {quantity_present: present}),
    };
    expect(mapAuditFindingDTO(dto).quantity).toBe(expected);
  });

  it("honors an empty authoritative photo list", () => {
    const dto = {question_code: "Q1", answer: "NO", photos: ["legacy.jpg"], photo_details: []};
    expect(mapAuditFindingDTO(dto).photos).toEqual([]);
  });
});
