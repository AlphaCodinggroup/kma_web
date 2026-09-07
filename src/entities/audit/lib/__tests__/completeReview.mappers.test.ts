// ---------------------------------------------------------------------------
// Tests for the complete-review response mapper
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { mapCompleteReviewResponseDTOToDomain } from "../completeReview.mappers";

describe("mapCompleteReviewResponseDTOToDomain", () => {
  it("maps every snake_case field to camelCase", () => {
    expect(
      mapCompleteReviewResponseDTOToDomain({
        audit_id: "audit-1",
        status: "final_report_sent_to_client",
        message: "Review completed",
        request_id: "req-123",
      })
    ).toEqual({
      auditId: "audit-1",
      status: "final_report_sent_to_client",
      message: "Review completed",
      requestId: "req-123",
    });
  });

  it("defaults the message to an empty string when it is absent", () => {
    const result = mapCompleteReviewResponseDTOToDomain({
      audit_id: "audit-1",
      status: "completed",
      request_id: "req-1",
    });

    expect(result.message).toBe("");
  });

  it("defaults the message to an empty string when it is null", () => {
    const result = mapCompleteReviewResponseDTOToDomain({
      audit_id: "audit-1",
      status: "completed",
      message: null,
      request_id: "req-1",
    });

    expect(result.message).toBe("");
  });

  // Un request_id vacío no permite seguir la generación del reporte: se corta
  // acá en vez de dejar al poller consultando "".
  it.each([
    ["empty", ""],
    ["blank", "   "],
    ["absent", undefined],
  ])("rejects a request_id that is %s", (_label, request_id) => {
    expect(() =>
      mapCompleteReviewResponseDTOToDomain({
        audit_id: "audit-1",
        status: "completed",
        request_id: request_id as never,
      })
    ).toThrow(/request_id is required/);
  });
});
