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

/** Tope de páginas que se recorren al seguir el cursor del listado. */
const MAX_LIST_PAGES = 50;

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

  async list(params?: import("@entities/audit/api/audit.repo").AuditListParams): Promise<AuditType> {
    // Build query parameters
    const searchParams = new URLSearchParams();

    if (params?.status) {
      searchParams.set('status', params.status);
    }
    if (params?.auditor) {
      searchParams.set('auditor', params.auditor);
    }
    // `!= null` y no truthy: limit 0 es un valor que el backend entiende y
    // descartarlo cambiaba silenciosamente la consulta.
    if (params?.limit != null) {
      searchParams.set('limit', params.limit.toString());
    }
    if (params?.last_eval_id) {
      searchParams.set('last_eval_id', params.last_eval_id);
    }

    // El backend acota su propia página y devuelve `last_eval_id` aunque se
    // pida un limit mayor. Sin seguir ese cursor, el listado se quedaba en la
    // primera página del backend y una auditoría creada después nunca
    // aparecía, con la paginación de la interfaz volviéndose decorativa.
    const requested = params?.limit ?? Number.POSITIVE_INFINITY;
    const dtos: ReturnType<typeof extractDtos> = [];
    let cursor = params?.last_eval_id;
    let total: number | undefined;
    let lastEvalId: string | undefined;

    for (let page = 0; page < MAX_LIST_PAGES; page += 1) {
      if (cursor) searchParams.set("last_eval_id", cursor);
      const pageUrl = searchParams.toString()
        ? `${INTERNAL_API_URL}?${searchParams.toString()}`
        : INTERNAL_API_URL;

      const res = await fetch(pageUrl, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      await ensureOk(res);

      const data = await res.json();
      dtos.push(...extractDtos(data));
      total = (data as any).total ?? total;
      lastEvalId = (data as any).last_eval_id;

      if (!lastEvalId || dtos.length >= requested) break;
      cursor = lastEvalId;
    }

    // Mapeo DTO → Dominio (status queda tal cual viene del backend)
    const resp: AuditType = {
      audits: dtos.map(mapAuditDtoToDomain),
      total: total ?? dtos.length,
      ...(lastEvalId ? { last_eval_id: lastEvalId } : {}),
    };
    return resp;
  }

  async delete(auditId: string): Promise<void> {
    const url = `${INTERNAL_API_URL}/${encodeURIComponent(auditId)}`;

    const res = await fetch(url, {
      method: "DELETE",
      credentials: "include",
      cache: "no-store",
    });

    await ensureOk(res);
  }
}

export const auditRepoImpl: AuditRepo = new AuditRepoHttp();
export default auditRepoImpl;
