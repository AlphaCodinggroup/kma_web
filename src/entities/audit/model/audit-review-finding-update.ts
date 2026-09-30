export interface AuditFindingPhotoInput {
  url: string;
  includeInReport?: boolean;
}

/** Valor nuevo de una medición; el nombre identifica cuál es y no se edita. */
export interface AuditFindingMeasurementInput {
  name: string | null;
  value: number;
}

export interface UpdateAuditFindingInput {
  auditId: string;
  questionCode: string;
  /**
   * Distingue dos hallazgos que comparten código de pregunta (dos variantes
   * de catálogo). Sólo hace falta cuando el código es ambiguo.
   */
  mitigationId?: string | null;
  quantity?: number | null;
  notes?: string | null;
  photos?: AuditFindingPhotoInput[];
  /**
   * Todas las mediciones del hallazgo, en su orden: el backend exige el mismo
   * largo y los mismos nombres que las guardadas y sólo cambia el valor.
   */
  measurements?: AuditFindingMeasurementInput[];
}

export interface AuditFindingUpdateResult {
  auditId: string;
  questionCode: string;
  status: string;
  message: string;
}
