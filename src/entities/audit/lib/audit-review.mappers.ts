import { toAuditStatus } from "@entities/audit/lib/audit-status";
import type {
  AuditFinding,
  AuditReviewDetail,
  FindingMeasurement,
  FindingPhoto,
} from "@entities/audit/model/audit-review";

type FindingPhotoDTO = string | { url?: string | null; include_in_report?: boolean | null };

type FindingMeasurementDTO = {
  name?: string | null;
  value?: number | string | null;
  unit?: string | null;
};

/**
 * Hallazgo tal como lo devuelve GET /audits-review/{id}. `cost` y `unit` son
 * los nombres de la respuesta de POST /reviews y se aceptan como respaldo.
 */
export type AuditFindingDTO = {
  question_code: string;
  answer: string;
  mitigation_id?: string | null;
  barrier_statement?: string | null;
  mitigation_statement?: string | null;
  code_reference?: string | null;
  quantity?: number | null;
  unit_cost?: number | null;
  unit_of_measure?: string | null;
  cost?: number | null;
  unit?: string | null;
  measurements?: FindingMeasurementDTO[] | null;
  notes?: string | null;
  photos?: FindingPhotoDTO[] | null;
  calculated_cost?: number | null;
};

export type AuditReviewDTO = {
  audit_id: string;
  flow_id: string;
  project_id?: string;
  status: string;
  findings: AuditFindingDTO[];
  total_cost?: number;
  created_at: string;
  updated_at: string;
};

const toNumber = (v: unknown, fallback = 0): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return fallback;
};

const toNumberOrNull = (v: unknown): number | null => {
  const n = toNumber(v, Number.NaN);
  return Number.isNaN(n) ? null : n;
};

const toTextOrNull = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v : null;

// El PDF imprime las fotos salvo que include_in_report sea false.
const mapPhoto = (photo: FindingPhotoDTO): FindingPhoto | null => {
  if (typeof photo === "string") {
    return photo.trim() ? { url: photo, includeInReport: true } : null;
  }
  const url = typeof photo?.url === "string" ? photo.url.trim() : "";
  if (!url) return null;
  return { url, includeInReport: photo.include_in_report !== false };
};

const mapMeasurement = (m: FindingMeasurementDTO): FindingMeasurement | null => {
  const value = toNumberOrNull(m?.value);
  if (value === null) return null;
  return { name: toTextOrNull(m.name), value, unit: toTextOrNull(m.unit) };
};

export const mapAuditFindingDTO = (dto: AuditFindingDTO): AuditFinding => {
  return {
    questionCode: dto.question_code,
    answer: dto.answer,
    mitigationId: toTextOrNull(dto.mitigation_id),
    barrierStatement: dto.barrier_statement ?? null,
    proposedMitigation: dto.mitigation_statement ?? null,
    adasReference: dto.code_reference ?? null,
    quantity: toNumberOrNull(dto.quantity),
    unitCost: toNumberOrNull(dto.unit_cost ?? dto.cost),
    unitOfMeasure: toTextOrNull(dto.unit_of_measure ?? dto.unit),
    measurements: (dto.measurements ?? [])
      .map(mapMeasurement)
      .filter((m): m is FindingMeasurement => m !== null),
    notes: dto.notes ?? null,
    photos: (dto.photos ?? [])
      .map(mapPhoto)
      .filter((p): p is FindingPhoto => p !== null),
    calculatedCost: toNumberOrNull(dto.calculated_cost),
  };
};

export const mapAuditReviewDTO = (dto: AuditReviewDTO): AuditReviewDetail => {
  return {
    auditId: dto.audit_id,
    flowId: dto.flow_id,
    projectId: dto.project_id ?? "",
    status: toAuditStatus(dto.status),
    findings: (dto.findings ?? []).map(mapAuditFindingDTO),
    totalCost: toNumber(dto.total_cost, 0),
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
};
