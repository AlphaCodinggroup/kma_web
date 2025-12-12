import type {
  AuditFindingPhotoInput,
  AuditFindingUpdateResult,
  UpdateAuditFindingInput,
} from "@entities/audit/model/audit-review-finding-update";

export type UpdateAuditFindingDTO = {
  quantity?: number;
  notes?: string | null;
  photos?: Array<{
    url: string;
    include_in_report?: boolean;
  }>;
};

export type AuditFindingUpdateResponseDTO = {
  audit_id: string;
  question_code: string;
  status: string;
  message?: string | null;
};

const normalizeNotes = (
  notes: UpdateAuditFindingInput["notes"]
): string | null | undefined => {
  if (typeof notes === "string") {
    const trimmed = notes.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (notes === null) return null;
  return undefined;
};

const mapPhotoInputToDTO = (
  photo: AuditFindingPhotoInput
): { url: string; include_in_report?: boolean } | null => {
  const url = typeof photo?.url === "string" ? photo.url.trim() : "";
  if (!url) return null;

  const dto: { url: string; include_in_report?: boolean } = { url };
  if (typeof photo.includeInReport === "boolean") {
    dto.include_in_report = photo.includeInReport;
  }
  return dto;
};

export const mapUpdateAuditFindingInputToDTO = (
  input: UpdateAuditFindingInput
): UpdateAuditFindingDTO => {
  const payload: UpdateAuditFindingDTO = {};

  if (typeof input.quantity === "number" && Number.isFinite(input.quantity)) {
    payload.quantity = input.quantity;
  }

  const notes = normalizeNotes(input.notes);
  if (typeof notes !== "undefined") {
    payload.notes = notes;
  }

  if (Array.isArray(input.photos)) {
    payload.photos = input.photos
      .map(mapPhotoInputToDTO)
      .filter(
        (
          p
        ): p is NonNullable<ReturnType<typeof mapPhotoInputToDTO>> => Boolean(p)
      );
  }

  return payload;
};

export const mapAuditFindingUpdateResponseDTOToDomain = (
  dto: AuditFindingUpdateResponseDTO
): AuditFindingUpdateResult => ({
  auditId: dto.audit_id,
  questionCode: dto.question_code,
  status: dto.status,
  message: dto.message ?? "",
});
