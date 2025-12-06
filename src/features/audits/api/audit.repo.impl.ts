import type { AuditRepo } from "@entities/audit/api/audit.repo";
import {
  mapAuditDtoToDomain,
  type AuditDTO,
} from "@entities/audit/lib/mappers";
import {
  mapAuditDetailDTOToDomain,
  type AuditDetailDTO,
} from "@entities/audit/lib/audit-detail.mappers";
import type { AuditType } from "@entities/audit/model";
import type { AuditDetail } from "@entities/audit/model/audit-detail";

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

function extractDetailDto(data: unknown): AuditDetailDTO | null {
  const d = data as any;
  if (d && typeof d === "object") {
    if (d.audit && typeof d.audit === "object") return d.audit as AuditDetailDTO;
    if (d.data && typeof d.data === "object") return d.data as AuditDetailDTO;
    if (d.id && d.status) return d as AuditDetailDTO;
  }
  return null;
}

// Helper común para manejar errores HTTP de forma consistente
async function ensureOk(res: Response): Promise<void> {
  if (res.ok) return;

  if (res.status === 401) {
    throw new AuditsApiError("Unauthorized", 401);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (isJson) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new AuditsApiError("Upstream error", res.status);
    }

    const msg =
      body &&
      typeof body === "object" &&
      "message" in body &&
      (body as any).message
        ? (body as any).message
        : "Upstream error";

    throw new AuditsApiError(String(msg), res.status);
  }

  const text = await res.text().catch(() => "");
  throw new AuditsApiError(text || "Upstream error", res.status);
}

class AuditRepoHttp implements AuditRepo {
  async getById(auditId: string): Promise<AuditDetail> {
    const res = await fetch(
      `${INTERNAL_API_URL}/${encodeURIComponent(auditId)}`,
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }
    );

    await ensureOk(res);

    const data = await res.json();
    const dto = extractDetailDto(data);

    if (!dto) {
      throw new AuditsApiError("Invalid audit detail response", res.status);
    }

    return mapAuditDetailDTOToDomain(dto);
  }

  async list(): Promise<AuditType> {
    const res = await fetch(INTERNAL_API_URL, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    await ensureOk(res);

    const data = await res.json();
    const dtos = extractDtos(data);

    // Mapeo DTO → Dominio (status queda tal cual viene del backend)
    const resp: AuditType = {
      audits: dtos.map(mapAuditDtoToDomain),
      total: (data as any).total,
    };
    return resp;
  }
}

export const auditRepoImpl: AuditRepo = new AuditRepoHttp();
export default auditRepoImpl;
