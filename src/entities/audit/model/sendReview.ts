import type { AuditStatus } from "../model";

export interface SendForReviewResult {
  auditId: string;
  auditReviewId: string;
  status: AuditStatus;
  message: string;
  reviewReady: boolean;
}

export interface ReviewProgress extends SendForReviewResult {}
