// ---------------------------------------------------------------------------
// Tests for the audit review status mappers
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
  mapUpdateAuditReviewStatusInputToDTO,
  mapAuditReviewStatusChangeDTOToDomain,
} from "../audit-review-status.mappers";
import type { AuditStatus } from "@entities/audit/model";

// ---------------------------------------------------------------------------
// mapUpdateAuditReviewStatusInputToDTO
// ---------------------------------------------------------------------------

describe("mapUpdateAuditReviewStatusInputToDTO", () => {
  it.each([
    "draft_report_pending_review",
    "draft_report_in_review",
    "final_report_sent_to_client",
    "completed",
  ] as const)("sends only the status field for %s", (status) => {
    const dto = mapUpdateAuditReviewStatusInputToDTO({
      auditId: "audit-1",
      status,
    });

    expect(dto).toEqual({ status });
    expect(dto).not.toHaveProperty("audit_id");
    expect(dto).not.toHaveProperty("auditId");
  });
});

// ---------------------------------------------------------------------------
// mapAuditReviewStatusChangeDTOToDomain
// ---------------------------------------------------------------------------

describe("mapAuditReviewStatusChangeDTOToDomain", () => {
  it("maps the snake_case transition to camelCase", () => {
    expect(
      mapAuditReviewStatusChangeDTOToDomain({
        audit_id: "audit-1",
        old_status: "draft_report_pending_review",
        new_status: "draft_report_in_review",
        message: "Status updated",
      })
    ).toEqual({
      auditId: "audit-1",
      oldStatus: "draft_report_pending_review",
      newStatus: "draft_report_in_review",
      message: "Status updated",
    });
  });

  it("keeps an empty message as an empty string", () => {
    const result = mapAuditReviewStatusChangeDTOToDomain({
      audit_id: "audit-1",
      old_status: "completed",
      new_status: "completed",
      message: "",
    });

    expect(result.message).toBe("");
  });

  // Los estados se normalizan contra la lista de estados conocidos: el mapper
  // confiaba en el tipado y un valor inesperado entraba al dominio sin
  // señalizarse.
  it("falls back to the initial status for an unknown one", () => {
    const result = mapAuditReviewStatusChangeDTOToDomain({
      audit_id: "audit-1",
      old_status: "surprise" as AuditStatus,
      new_status: "completed",
      message: "",
    });

    expect(result.oldStatus).toBe("draft_report_pending_review");
    expect(result.newStatus).toBe("completed");
  });
});
