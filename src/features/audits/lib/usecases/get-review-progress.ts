import type { AuditReviewRepo } from "@entities/audit/api/sendReview.repo";
import type { ReviewProgress } from "@entities/audit/model/sendReview";
import { auditReviewRepo } from "@features/audits/api/sendReview.repo.impl";

export type GetReviewProgress = (
  auditReviewId: string
) => Promise<ReviewProgress>;

export function makeGetReviewProgressUsecase(deps: {
  repo: AuditReviewRepo;
}): GetReviewProgress {
  const { repo } = deps;

  return async (auditReviewId: string): Promise<ReviewProgress> => {
    const progress = await repo.pollReview(auditReviewId);
    return progress;
  };
}

export const getReviewProgress: GetReviewProgress =
  makeGetReviewProgressUsecase({
    repo: auditReviewRepo,
  });
