import type { AuditStatus } from "@entities/audit/model";

export interface AuditFinding {
  questionCode: string;
  answer: string;
  barrierStatement?: string | null;
  proposedMitigation?: string | null;
  adasReference?: string | null;
  quantity: number;
  cost: number;
  unit?: string | null;
  totalCost: number;
  notes?: string | null;
  photos: string[];
  includeInReport: boolean;
  qcComment?: string | null;
  updatedAt?: string | null;
  calculatedCost?: number;
}

/**
 * Detalle de revisión de una auditoría para QC.
 */
export interface AuditReviewDetail {
  auditId: string;
  flowId: string;
  projectId: string;
  status: AuditStatus;
  findings: AuditFinding[];
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}
