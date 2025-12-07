import type { IsoDateString } from "@entities/audit/model";
import type {
  AuditReviewComment,
  CreateAuditCommentInput,
} from "@entities/audit/model/comments";

export type CreateAuditCommentDTO = {
  audit_id: string;
  step_id: string;
  content: string;
};

export type AuditCommentResponseDTO = {
  id: string;
  audit_id?: string | null;
  auditId?: string | null;
  user_id?: string | null;
  userId?: string | null;
  step_id?: string | null;
  stepId?: string | null;
  content?: string | null;
  version?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const toIso = (value?: string | null): IsoDateString => {
  return (value ?? "") as IsoDateString;
};

const toNumber = (value: unknown, fallback = 1): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (
    typeof value === "string" &&
    value.trim() !== "" &&
    !Number.isNaN(Number(value))
  ) {
    return Number(value);
  }
  return fallback;
};

export const mapCreateAuditCommentInputToDTO = (
  input: CreateAuditCommentInput
): CreateAuditCommentDTO => {
  return {
    audit_id: input.auditId,
    step_id: input.stepId,
    content: input.content.trim(),
  };
};

export const mapAuditCommentResponseDTOToDomain = (
  dto: AuditCommentResponseDTO
): AuditReviewComment => {
  const created = dto.created_at ?? dto.updated_at ?? "";
  const updated = dto.updated_at ?? dto.created_at ?? "";

  return {
    id: dto.id,
    auditId: dto.audit_id ?? dto.auditId ?? "",
    stepId: dto.step_id ?? dto.stepId ?? "",
    userId: dto.user_id ?? dto.userId ?? "",
    content: dto.content ?? "",
    version: toNumber(dto.version, 1),
    createdAt: toIso(created),
    updatedAt: toIso(updated),
  };
};
