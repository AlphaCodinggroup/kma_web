import { toIsoDate } from "@shared/lib/coerce";
import { toAuditStatus } from "@entities/audit/lib/audit-status";
import type { Audit, IsoDateString } from "@entities/audit/model";

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

// Valida la fecha además de recortarla: antes una inválida llegaba tal cual al
// dominio y sólo fallaba al renderizarse como "Invalid Date".
const toIsoOrEmpty = (v?: string | null): IsoDateString =>
  toIsoDate(v) as IsoDateString;

/** ========= Audit mapping ========= */

export const mapAuditDtoToDomain = (dto: AuditDTO): Audit => {
  return {
    id: dto.id,
    flowId: dto.flow_id ?? "",
    flowName: dto.flow_name ?? null,
    version: dto.flow_version ?? 1,
    projectId: emptyToNull(dto.project_id),
    // El modelo declara estos nombres como `string | null`: devolver "" cuando
    // faltan obligaba a la interfaz a chequear los dos valores vacíos.
    projectName: dto.project_name ?? null,
    facilityId: emptyToNull(dto.facility_id),
    status: toAuditStatus(dto.status),
    createdBy: emptyToNull(dto.created_by),
    updatedBy: emptyToNull(dto.updated_by),
    createdAt: toIsoOrEmpty(dto.created_at),
    updatedAt: toIsoOrEmpty(dto.updated_at),
    auditorName: dto.auditor_name ?? null,
    facilityName: dto.facility_name ?? null,
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
