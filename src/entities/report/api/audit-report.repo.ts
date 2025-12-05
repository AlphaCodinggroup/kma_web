import type { AuditReport } from "@entities/report/model/audit-report";

export interface AuditReportRepo {
  getReport(auditId: string): Promise<AuditReport>;
}
