import type { AuditRepo } from "@entities/audit/api/audit.repo";
import {
  mapCompleteReviewResponseDTOToDomain,
  type CompleteReviewResponseDTO,
} from "@entities/audit/lib/completeReview.mappers";
import {
  mapAuditDtoToDomain,
  type AuditDTO,
} from "@entities/audit/lib/mappers";
import type { AuditType } from "@entities/audit/model";
import type { CompleteReviewResult } from "@entities/audit/model/completeReview";

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

  async completeReview(auditId: string): Promise<CompleteReviewResult> {
    const res = await fetch(
      `${INTERNAL_API_URL}/${encodeURIComponent(auditId)}/complete-review`,
      {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      }
    );

    await ensureOk(res);

    const data = (await res.json()) as CompleteReviewResponseDTO;
    return mapCompleteReviewResponseDTOToDomain(data);
  }
}

export const auditRepoImpl: AuditRepo = new AuditRepoHttp();
export default auditRepoImpl;
