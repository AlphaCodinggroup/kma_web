import type { AxiosInstance } from "axios";
import { httpClient } from "@shared/api/http.client";
import type { AuditReportRepo } from "@entities/report/api/audit-report.repo";
import type { AuditReport } from "@entities/report/model/audit-report";
import {
  mapAuditReportDTO,
  type AuditReportDTO,
} from "@entities/report/lib/audit-report.mappers";

const sameOrigin = typeof window !== "undefined" ? window.location.origin : "";
const apiBase = sameOrigin ? `${sameOrigin}/api` : "/api";

const routes = {
  reportByAudit: (auditId: string) =>
    `${apiBase}/reports/${encodeURIComponent(auditId)}`,
};

export function createAuditReportRepo(
  client: AxiosInstance = httpClient
): AuditReportRepo {
  return {
    async getReport(auditId: string): Promise<AuditReport> {
      const { data } = await client.get<AuditReportDTO>(
        routes.reportByAudit(auditId)
      );
      return mapAuditReportDTO(data);
    },
  };
}

/** Instancia por defecto para consumo desde UI. */
export const auditReportRepo = createAuditReportRepo();
