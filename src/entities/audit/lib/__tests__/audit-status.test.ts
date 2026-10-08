import { describe, expect, it } from "vitest";
import { mapAuditDtoToDomain } from "../mappers";
import { mapAuditDetailDTOToDomain } from "../audit-detail.mappers";
import { isAuditStatus, toAuditStatus } from "../audit-status";

describe("audit status preserves operational truth", () => {
  it.each(["audit_in_progress", "deleted", "draft_report_pending_review", "draft_report_in_review", "final_report_sent_to_client", "completed"])("preserves backend state %s in list and detail", status => {
    expect(isAuditStatus(status)).toBe(true);
    expect(mapAuditDtoToDomain({ id: "audit", flow_id: "flow", status }).status).toBe(status);
    expect(mapAuditDetailDTOToDomain({ id: "audit", status }).status).toBe(status);
  });

  it.each([undefined, null, "", "future_backend_state", 12, {}])("does not turn an unavailable state into pending work: %j", raw => {
    expect(toAuditStatus(raw)).toBe("unknown");
    expect(isAuditStatus(raw)).toBe(false);
  });
});
