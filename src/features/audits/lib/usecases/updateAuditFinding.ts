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
  const { auditId, questionCode, quantity, notes, photos } = input;

  if (!auditId) {
    throw new Error("updateAuditFinding: auditId is required");
  }
  if (!questionCode) {
    throw new Error("updateAuditFinding: questionCode is required");
  }

  const hasQuantity = typeof quantity !== "undefined";
  const hasNotes = typeof notes !== "undefined";
  const hasPhotos = typeof photos !== "undefined";

  if (!hasQuantity && !hasNotes && !hasPhotos) {
    throw new Error(
      "updateAuditFinding: at least one field (quantity, notes or photos) must be provided"
    );
  }

  if (hasQuantity && quantity !== null && !Number.isFinite(quantity)) {
    throw new Error("updateAuditFinding: quantity must be a finite number");
  }

  const payload: UpdateAuditFindingInput = {
    auditId,
    questionCode,
  };

  if (hasQuantity) {
    payload.quantity = quantity;
  }

  if (hasNotes) {
    payload.notes = typeof notes === "string" ? notes.trim() : notes;
  }

  if (hasPhotos) {
    payload.photos = photos;
  }

  return repo.updateFinding(payload);
}

export default updateAuditFinding;
