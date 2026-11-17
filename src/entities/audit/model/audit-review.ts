import type { AuditStatus } from "@entities/audit/model";

/** Medición cargada por el auditor (p. ej. 45 pulgadas). */
export interface FindingMeasurement {
  name: string | null;
  value: number | null;
  unit: string | null;
  sourceQuestionCode?: string;
  sourceStepId?: string;
  capturedValue?: number | null;
}

/** Foto de un hallazgo; las que no van al reporte no se imprimen en el PDF. */
export interface FindingPhoto {
  url: string;
  reference?: string;
  includeInReport: boolean;
}

export interface AuditFinding {
  /** Código de pregunta; en hallazgos agrupados, varios separados por coma. */
  questionCode: string;
  answer: string;
  mitigationId: string | null;
  barrierStatement?: string | null;
  barrierDetails?: {questionCode: string; barrierStatement: string | null}[];
  proposedMitigation?: string | null;
  adasReference?: string | null;
  /** null cuando no hay cantidad; cero es un valor explícito. */
  quantity: number | null;
  /** Costo unitario del catálogo. */
  unitCost: number | null;
  unitOfMeasure: string | null;
  measurements: FindingMeasurement[];
  notes?: string | null;
  photos: FindingPhoto[];
  /** cantidad × costo unitario, calculado por el backend. */
  calculatedCost: number | null;
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
