import type { AxiosInstance } from "axios";
import { httpClient } from "@shared/api/http.client";
import type { AuditCommentsRepo } from "@entities/audit/api/audit-comments.repo";
import type {
  AuditReviewComment,
  CreateAuditCommentInput,
  UpdateAuditCommentInput,
} from "@entities/audit/model/comments";
import {
  mapAuditCommentResponseDTOToDomain,
  mapCreateAuditCommentInputToDTO,
  mapUpdateAuditCommentInputToDTO,
  mapAuditCommentsListDTOToDomain,
  type AuditCommentResponseDTO,
  type AuditCommentsListDTO,
} from "@entities/audit/lib/audit-comments.mappers";

const sameOrigin = typeof window !== "undefined" ? window.location.origin : "";
const apiBase = sameOrigin ? `${sameOrigin}/api` : "/api";

const routes = {
  createComment: () => `${apiBase}/comments`,
  updateComment: (commentId: string) =>
    `${apiBase}/comments/${encodeURIComponent(commentId)}`,
  listComments: (auditId: string) =>
    `${apiBase}/comments?audit_id=${encodeURIComponent(auditId)}`,
};

export class AuditCommentsRepoHttp implements AuditCommentsRepo {
  private readonly client: AxiosInstance;

  constructor(client: AxiosInstance = httpClient) {
    this.client = client;
  }

  async createComment(
    input: CreateAuditCommentInput
  ): Promise<AuditReviewComment> {
    const payload = mapCreateAuditCommentInputToDTO(input);
    const { data } = await this.client.post<AuditCommentResponseDTO>(
      routes.createComment(),
      payload
    );
    return mapAuditCommentResponseDTOToDomain(data);
  }

  async updateComment(
    input: UpdateAuditCommentInput
  ): Promise<AuditReviewComment> {
    const payload = mapUpdateAuditCommentInputToDTO(input);
    const { data } = await this.client.patch<AuditCommentResponseDTO>(
      routes.updateComment(input.commentId),
      payload
    );
    return mapAuditCommentResponseDTOToDomain(data);
  }

  async listByAudit(auditId: string) {
    const { data } = await this.client.get<AuditCommentsListDTO>(
      routes.listComments(auditId)
    );
    return mapAuditCommentsListDTOToDomain(data);
  }
}

/** Instancia por defecto para consumo desde UI. */
export const auditCommentsRepo = new AuditCommentsRepoHttp();
