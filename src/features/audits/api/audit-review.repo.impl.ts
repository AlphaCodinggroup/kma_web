import type { AxiosInstance } from "axios";
import { httpClient } from "@shared/api/http.client";
import type { AuditReviewDetail } from "@entities/audit/model/audit-review";
import type {
  AuditFindingUpdateResult,
  UpdateAuditFindingInput,
} from "@entities/audit/model/audit-review-finding-update";
import type { CompleteReviewResult } from "@entities/audit/model/completeReview";
import {
  mapAuditReviewDTO,
  type AuditReviewDTO,
} from "@entities/audit/lib/audit-review.mappers";
import type { AuditReviewDetailRepo } from "@entities/audit/api/audit-review.repo";
import {
  mapAuditFindingUpdateResponseDTOToDomain,
  mapUpdateAuditFindingInputToDTO,
  type AuditFindingUpdateResponseDTO,
} from "@entities/audit/lib/audit-review-finding-update.mappers";
import {
  mapCompleteReviewResponseDTOToDomain,
  type CompleteReviewResponseDTO,
} from "@entities/audit/lib/completeReview.mappers";
import type {
  AuditReviewStatusChange,
  ApplyAuditEventInput,
} from "@entities/audit/model/audit-review-status";
import {
  mapAuditReviewStatusChangeDTOToDomain,
  mapApplyAuditEventInputToDTO,
  type AuditReviewStatusChangeDTO,
} from "@entities/audit/lib/audit-review-status.mappers";

const sameOrigin = typeof window !== "undefined" ? window.location.origin : "";
const apiBase = sameOrigin ? `${sameOrigin}/api` : "/api";

const routes = {
  reviewDetail: (auditReviewId: string) =>
    `${apiBase}/audits/audit-reviews/${encodeURIComponent(auditReviewId)}`,
  completeReview: (auditId: string) =>
    `${apiBase}/audits-review/${encodeURIComponent(auditId)}/complete-review`,
  openReview: (auditId: string) =>
    `${apiBase}/audits-review/${encodeURIComponent(auditId)}/reviews`,
  applyEvent: (auditId: string) =>
    `${apiBase}/audits-review/${encodeURIComponent(auditId)}/status`,
  updateFinding: (auditId: string, questionCode: string) =>
    `${apiBase}/audits-review/${encodeURIComponent(
      auditId
    )}/findings/${encodeURIComponent(questionCode)}`,
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
    async openReview(auditId: string): Promise<AuditReviewDetail> {
      const { data } = await client.post<AuditReviewDTO>(
        routes.openReview(auditId)
      );
      return mapAuditReviewDTO(data);
    },
    async applyEvent(
      input: ApplyAuditEventInput
    ): Promise<AuditReviewStatusChange> {
      const payload = mapApplyAuditEventInputToDTO(input);
      const { data } = await client.patch<AuditReviewStatusChangeDTO>(
        routes.applyEvent(input.auditId),
        payload
      );
      return mapAuditReviewStatusChangeDTOToDomain(data);
    },
    async updateFinding(
      input: UpdateAuditFindingInput
    ): Promise<AuditFindingUpdateResult> {
      const payload = mapUpdateAuditFindingInputToDTO(input);
      const { data } = await client.patch<AuditFindingUpdateResponseDTO>(
        routes.updateFinding(input.auditId, input.questionCode),
        payload
      );
      return mapAuditFindingUpdateResponseDTOToDomain(data);
    },
  };
}

/** Instancia por defecto para consumo desde UI. */
export const auditReviewDetailRepo = createAuditReviewDetailRepo();
