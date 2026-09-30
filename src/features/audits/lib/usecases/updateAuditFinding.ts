import type { AuditReviewDetailRepo } from "@entities/audit/api/audit-review.repo";
import type {
  AuditFindingUpdateResult,
  UpdateAuditFindingInput,
} from "@entities/audit/model/audit-review-finding-update";
import { auditReviewDetailRepo } from "@features/audits/api/audit-review.repo.impl";

type Deps = {
  auditReviewRepo: AuditReviewDetailRepo;
};

const defaultDeps: Deps = {
  auditReviewRepo: auditReviewDetailRepo,
};

export async function updateAuditFinding(
  input: UpdateAuditFindingInput,
  deps: Partial<Deps> = {}
): Promise<AuditFindingUpdateResult> {
  const repo = deps.auditReviewRepo ?? defaultDeps.auditReviewRepo;
  const { auditId, questionCode, mitigationId, quantity, notes, photos, measurements } =
    input;

  if (!auditId) {
    throw new Error("updateAuditFinding: auditId is required");
  }
  if (!questionCode) {
    throw new Error("updateAuditFinding: questionCode is required");
  }

  const hasQuantity = typeof quantity !== "undefined";
  const hasNotes = typeof notes !== "undefined";
  const hasPhotos = typeof photos !== "undefined";
  const hasMeasurements = typeof measurements !== "undefined";

  if (!hasQuantity && !hasNotes && !hasPhotos && !hasMeasurements) {
    throw new Error(
      "updateAuditFinding: at least one field (quantity, notes, photos or measurements) must be provided"
    );
  }

  if (hasQuantity && quantity !== null && !Number.isFinite(quantity)) {
    throw new Error("updateAuditFinding: quantity must be a finite number");
  }

  if (measurements?.some((m) => !Number.isFinite(m.value) || m.value < 0)) {
    throw new Error(
      "updateAuditFinding: every measurement must be a finite number of 0 or more"
    );
  }

  const payload: UpdateAuditFindingInput = {
    auditId,
    questionCode,
  };

  if (mitigationId) {
    payload.mitigationId = mitigationId;
  }

  if (hasQuantity) {
    payload.quantity = quantity;
  }

  if (hasNotes) {
    payload.notes = typeof notes === "string" ? notes.trim() : notes;
  }

  if (hasPhotos) {
    payload.photos = photos;
  }

  if (hasMeasurements) {
    payload.measurements = measurements;
  }

  return repo.updateFinding(payload);
}

export default updateAuditFinding;
