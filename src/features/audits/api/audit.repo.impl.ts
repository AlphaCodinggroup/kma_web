import type { AuditRepo } from "@entities/audit/api/audit.repo";
import {
  mapAuditDtoToDomain,
  type AuditDTO,
} from "@entities/audit/lib/mappers";
import type { AuditType } from "@entities/audit/model";

export class AuditsApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "AuditsApiError";
    if (typeof status === "number") {
      this.status = status;
    }
  }
}

const INTERNAL_API_URL = `/api/audits`;

// Helper para extraer robustamente el array de DTOs
function extractDtos(data: unknown): AuditDTO[] {
  const d = data as any;
  if (Array.isArray(d)) return d as AuditDTO[];
  if (Array.isArray(d?.audits)) return d.audits as AuditDTO[];
  if (Array.isArray(d?.items)) return d.items as AuditDTO[];
  if (Array.isArray(d?.data)) return d.data as AuditDTO[];
  return [];
}

class AuditRepoHttp implements AuditRepo {
  async list(): Promise<AuditType> {
    const res = await fetch(INTERNAL_API_URL, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new AuditsApiError("Unauthorized", 401);
      }
      const maybeJson = res.headers
        .get("content-type")
        ?.includes("application/json");
      if (maybeJson) {
        const body = (await res.json()) as unknown;
        const msg =
          (body &&
            typeof body === "object" &&
            "message" in body &&
            (body as any).message) ||
          "Upstream error";
        throw new AuditsApiError(String(msg), res.status);
      }
      const text = await res.text();
      throw new AuditsApiError(text || "Upstream error", res.status);
    }
    const data = await res.json();
    const dtos = extractDtos(data);

    // Mapeo DTO → Dominio (status queda tal cual viene del backend)
    const resp: AuditType = {
      audits: dtos.map(mapAuditDtoToDomain),
      total: data.total,
    };
    return resp;
  }
}

export const auditRepoImpl: AuditRepo = new AuditRepoHttp();
export default auditRepoImpl;
