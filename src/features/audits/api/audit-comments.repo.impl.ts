import type { AxiosInstance } from "axios";
import { httpClient } from "@shared/api/http.client";
import type { AuditCommentsRepo } from "@entities/audit/api/audit-comments.repo";
import type {
  AuditReviewComment,
  CreateAuditCommentInput,
} from "@entities/audit/model/comments";
import {
  mapAuditCommentResponseDTOToDomain,
  mapCreateAuditCommentInputToDTO,
  type AuditCommentResponseDTO,
} from "@entities/audit/lib/audit-comments.mappers";

const sameOrigin = typeof window !== "undefined" ? window.location.origin : "";
const apiBase = sameOrigin ? `${sameOrigin}/api` : "/api";

const routes = {
  createComment: () => `${apiBase}/comments`,
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
}

/** Instancia por defecto para consumo desde UI. */
export const auditCommentsRepo = new AuditCommentsRepoHttp();
