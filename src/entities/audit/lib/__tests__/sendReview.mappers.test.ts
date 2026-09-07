// ---------------------------------------------------------------------------
// Tests for the send-for-review mappers
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
  mapSendForReviewDTO,
  mapReviewProgressDTO,
  type SendForReviewDTO,
} from "../sendReview.mappers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** DTO minimo con los tres campos obligatorios. */
function makeDTO(overrides: Partial<SendForReviewDTO> = {}): SendForReviewDTO {
  return {
    audit_id: "audit-1",
    audit_review_id: "review-1",
    status: "draft_report_in_review",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// mapSendForReviewDTO
// ---------------------------------------------------------------------------

describe("mapSendForReviewDTO", () => {
  it("maps every snake_case field to camelCase", () => {
    expect(
      mapSendForReviewDTO(
        makeDTO({ message: "Sent for review", review_ready: true })
      )
    ).toEqual({
      auditId: "audit-1",
      auditReviewId: "review-1",
      status: "draft_report_in_review",
      message: "Sent for review",
      reviewReady: true,
    });
  });

  it("defaults message to an empty string and reviewReady to false", () => {
    const result = mapSendForReviewDTO(makeDTO());

    expect(result.message).toBe("");
    expect(result.reviewReady).toBe(false);
  });

  it.each([
    "draft_report_pending_review",
    "draft_report_in_review",
    "final_report_sent_to_client",
    "completed",
  ])("keeps the known status %s", (status) => {
    expect(mapSendForReviewDTO(makeDTO({ status })).status).toBe(status);
  });

  it("passes an unknown status through unchanged", () => {
    // FIXME: la lista blanca `allowed` es decorativa: ambas ramas devuelven el
    // mismo valor casteado a AuditStatus.
    expect(mapSendForReviewDTO(makeDTO({ status: "surprise" })).status).toBe(
      "surprise"
    );
  });

  it("passes an empty status through unchanged", () => {
    expect(mapSendForReviewDTO(makeDTO({ status: "" })).status).toBe("");
  });

  it.each([
    ["true", true, true],
    ["false", false, false],
    ["truthy string", "yes", true],
    ["empty string", "", false],
    ["number 1", 1, true],
    ["number 0", 0, false],
    ["null", null, false],
  ])("coerces review_ready %s to %s", (_label, value, expected) => {
    expect(
      mapSendForReviewDTO(makeDTO({ review_ready: value as never })).reviewReady
    ).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// mapReviewProgressDTO
// ---------------------------------------------------------------------------

describe("mapReviewProgressDTO", () => {
  it("produces the same result as mapSendForReviewDTO", () => {
    const dto = makeDTO({ message: "polling", review_ready: true });

    expect(mapReviewProgressDTO(dto)).toEqual(mapSendForReviewDTO(dto));
  });
});
