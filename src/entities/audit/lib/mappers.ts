import { toIsoDate } from "@shared/lib/coerce";
import type { Audit, AuditStatus, IsoDateString } from "@entities/audit/model";

export type AuditDTO = {
  id: string;
  flow_id: string;
  flow_name?: string | null;
  flow_version?: number;
  project_id?: string | null;
  facility_id?: string | null;
  status: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  project_name?: string | null;
  auditor_name?: string | null;
  facility_name?: string | null;
  findings_count?: number | null;
};

export type AuditsResponseDTO = {
  audits: AuditDTO[];
};

const emptyToNull = (v?: string | null): string | null => {
  const s = (v ?? "").trim();
  return s === "" ? null : s;
};


/** ========= Audit mapping ========= */

export const mapAuditDtoToDomain = (dto: AuditDTO): Audit => {
  return {
    id: dto.id,
    flowId: dto.flow_id ?? "",
    flowName: dto.flow_name ?? null,
    version: dto.flow_version ?? 1,
    projectId: emptyToNull(dto.project_id),
    projectName: dto.project_name ?? "",
    facilityId: emptyToNull(dto.facility_id),
    status: (dto.status ?? "") as AuditStatus,
    createdBy: emptyToNull(dto.created_by),
    updatedBy: emptyToNull(dto.updated_by),
    createdAt: toIsoDate(dto.created_at),
    updatedAt: toIsoDate(dto.updated_at),
    auditorName: dto.auditor_name ?? "",
    facilityName: dto.facility_name ?? "",
    findingsCount: dto.findings_count ?? null,
  };
};

/**
 * Mapea { audits: AuditDTO[] } → Audit[]
 * Reutilizable en el repo para el GET /audits.
 */
export const mapAuditsResponseToDomain = (res: AuditsResponseDTO): Audit[] => {
  const items = Array.isArray(res?.audits) ? res.audits : [];
  return items.map(mapAuditDtoToDomain);
};
