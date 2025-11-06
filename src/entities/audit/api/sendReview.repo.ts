import type { ReviewProgress, SendForReviewResult } from "../model/sendReview";
import type { AuditRepo } from "./audit.repo";

export interface AuditReviewRepo {
  sendForReview(auditId: string): Promise<SendForReviewResult>;

  pollReview(auditReviewId: string): Promise<ReviewProgress>;
}

export type AuditRepoWithReview = AuditRepo & AuditReviewRepo;
