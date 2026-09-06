import { toBool, toNumber } from "@shared/lib/coerce";
import { toAuditStatus } from "@entities/audit/lib/audit-status";
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
	version: number;
  flow_id: string;
  project_id: string;
  status: string;
  findings: AuditFindingDTO[];
  total_cost: number;
  created_at: string;
  updated_at: string;
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
	version: toNumber(dto.version, 1),
    flowId: dto.flow_id,
    projectId: dto.project_id,
    status: toAuditStatus(dto.status),
    findings: (dto.findings ?? []).map(mapAuditFindingDTO),
    totalCost: toNumber(dto.total_cost, 0),
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
};
