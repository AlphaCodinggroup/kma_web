import type { AxiosInstance } from "axios";
import { httpClient } from "@shared/api/http.client";
import type { AuditReviewRepo } from "@entities/audit/api/sendReview.repo";
import {
  mapReviewProgressDTO,
  mapSendForReviewDTO,
  type SendForReviewDTO,
} from "@entities/audit/lib/sendReview.mappers";
import type {
  ReviewProgress,
  SendForReviewResult,
} from "@entities/audit/model/sendReview";

const sameOrigin = typeof window !== "undefined" ? window.location.origin : "";
const apiBase = sameOrigin ? `${sameOrigin}/api` : "/api";

const routes = {
  sendForReview: (auditId: string) =>
    `${apiBase}/audits/${encodeURIComponent(auditId)}/send-for-review`,
  reviewStatus: (auditReviewId: string) =>
    `${apiBase}/audit-reviews/${encodeURIComponent(auditReviewId)}`,
};

export function createAuditReviewRepo(
  client: AxiosInstance = httpClient
): AuditReviewRepo {
  return {
    async sendForReview(auditId: string): Promise<SendForReviewResult> {
      const { data } = await client.post<SendForReviewDTO>(
        routes.sendForReview(auditId)
      );
      return mapSendForReviewDTO(data);
    },

    async pollReview(auditReviewId: string): Promise<ReviewProgress> {
      const { data } = await client.get<SendForReviewDTO>(
        routes.reviewStatus(auditReviewId)
      );
      return mapReviewProgressDTO(data);
    },
  };
}

/** Instancia por defecto para uso en UI (browser). */
export const auditReviewRepo = createAuditReviewRepo();
