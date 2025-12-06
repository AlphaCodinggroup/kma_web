import type { AxiosInstance } from "axios";
import { httpClient } from "@shared/api/http.client";
import type { AuditReviewDetail } from "@entities/audit/model/audit-review";
import type { CompleteReviewResult } from "@entities/audit/model/completeReview";
import {
  mapAuditReviewDTO,
  type AuditReviewDTO,
} from "@entities/audit/lib/audit-review.mappers";
import type { AuditReviewDetailRepo } from "@entities/audit/api/audit-review.repo";
import {
  mapCompleteReviewResponseDTOToDomain,
  type CompleteReviewResponseDTO,
} from "@entities/audit/lib/completeReview.mappers";

const sameOrigin = typeof window !== "undefined" ? window.location.origin : "";
const apiBase = sameOrigin ? `${sameOrigin}/api` : "/api";

const routes = {
  reviewDetail: (auditReviewId: string) =>
    `${apiBase}/audits/audit-reviews/${encodeURIComponent(auditReviewId)}`,
  completeReview: (auditId: string) =>
    `${apiBase}/audits-review/${encodeURIComponent(auditId)}/complete-review`,
};

export function createAuditReviewDetailRepo(
  client: AxiosInstance = httpClient
): AuditReviewDetailRepo {
  return {
    async getReviewDetail(auditReviewId: string): Promise<AuditReviewDetail> {
      const { data } = await client.get<AuditReviewDTO>(
        routes.reviewDetail(auditReviewId)
      );
      return mapAuditReviewDTO(data);
    },
    async completeReview(auditId: string): Promise<CompleteReviewResult> {
      const { data } = await client.post<CompleteReviewResponseDTO>(
        routes.completeReview(auditId)
      );
      return mapCompleteReviewResponseDTOToDomain(data);
    },
  };
}

/** Instancia por defecto para consumo desde UI. */
export const auditReviewDetailRepo = createAuditReviewDetailRepo();
