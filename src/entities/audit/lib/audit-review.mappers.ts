import type { AuditStatus } from "@entities/audit/model";
import type {
  AuditFinding,
  AuditReviewDetail,
} from "@entities/audit/model/audit-review";

export type AuditFindingDTO = {
  question_code: string;
  answer: string;
  barrier_statement?: string | null;
  mitigation_statement?: string | null;
  code_reference?: string | null;
  quantity: number;
  cost: number;
  unit?: string | null;
  total_cost: number;
  notes?: string | null;
  photos?: string[] | null;
  include_in_report?: boolean;
  calculated_cost?: number;
};

export type AuditReviewDTO = {
  audit_id: string;
  flow_id: string;
  project_id: string;
  status: string;
  findings: AuditFindingDTO[];
  total_cost: number;
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

const toBool = (v: unknown, fallback = false): boolean => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toLowerCase() === "true";
  if (typeof v === "number") return v !== 0;
  return fallback;
};

/** Lista de estados conocidos; si llega uno nuevo, lo preservamos para no romper. */
const toAuditStatus = (raw: string): AuditStatus => {
  const allowed: AuditStatus[] = [
    "draft_report_pending_review",
    "draft_report_in_review",
    "final_report_sent_to_client",
    "completed",
  ];
  return (allowed.includes(raw as AuditStatus) ? raw : raw) as AuditStatus;
};

export const mapAuditFindingDTO = (dto: AuditFindingDTO): AuditFinding => {
  return {
    questionCode: dto.question_code,
    answer: dto.answer,
    barrierStatement: dto.barrier_statement ?? null,
    proposedMitigation: dto.mitigation_statement ?? null,
    adasReference: dto.code_reference ?? null,
    quantity: toNumber(dto.quantity, 0),
    cost: toNumber(dto.cost, 0),
    unit: dto.unit ?? null,
    totalCost: toNumber(dto.total_cost, 0),
    notes: dto.notes ?? null,
    photos: Array.isArray(dto.photos) ? dto.photos : [],
    includeInReport: toBool(dto.include_in_report, false),
    calculatedCost: toNumber(dto.calculated_cost, 0),
  };
};

export const mapAuditReviewDTO = (dto: AuditReviewDTO): AuditReviewDetail => {
  return {
    auditId: dto.audit_id,
    flowId: dto.flow_id,
    projectId: dto.project_id,
    status: toAuditStatus(dto.status),
    findings: (dto.findings ?? []).map(mapAuditFindingDTO),
    totalCost: toNumber(dto.total_cost, 0),
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
};
