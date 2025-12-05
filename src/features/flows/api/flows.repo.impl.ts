import type { FlowsRepo } from "@entities/flow/api/flows.repo";
import type { Flow, FlowId, FlowList } from "@entities/flow/model";
import { parseFlowListDTO, FlowDTOSchema } from "./flows.dto";
import { mapFlowListDTO, mapFlowDTO, mapFlowToDTO } from "@entities/flow/lib/mappers";

/**
 * Error normalizado de API.
 */
export class FlowsApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "FlowsApiError";
    if (typeof status === "number") {
      this.status = status;
    }
  }
}

const INTERNAL_API_URL = "/api/flows";

export class FlowsHttpRepo implements FlowsRepo {
  async list(): Promise<FlowList> {
    const res = await fetch(INTERNAL_API_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      // importante para no cachear el catálogo si cambia en backend
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new FlowsApiError("Unauthorized", 401);
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
        throw new FlowsApiError(String(msg), res.status);
      }
      const text = await res.text();
      throw new FlowsApiError(text || "Upstream error", res.status);
    }

    const raw = (await res.json()) as unknown;
    const dto = parseFlowListDTO(raw);
    const domain = mapFlowListDTO(dto);
    return domain;
  }

  async getById(id: FlowId): Promise<Flow | null> {
    const res = await fetch(`${INTERNAL_API_URL}/${id}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 404) {
        return null;
      }
      if (res.status === 401) {
        throw new FlowsApiError("Unauthorized", 401);
      }
      const text = await res.text();
      throw new FlowsApiError(text || "Upstream error", res.status);
    }

    const raw = (await res.json()) as unknown;
    const dto = FlowDTOSchema.parse(raw);
    return mapFlowDTO(dto);
  }

  async getPresignedUrl(fileName: string, fileType: string): Promise<{ uploadUrl: string; publicUrl: string }> {
    const res = await fetch("/api/uploads/presigned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, fileType }),
    });

    if (!res.ok) {
      throw new FlowsApiError("Failed to get presigned URL", res.status);
    }

    return (await res.json()) as { uploadUrl: string; publicUrl: string };
  }

  async uploadFile(uploadUrl: string, file: File): Promise<void> {
    const encodedUrl = btoa(uploadUrl);
    const proxyUrl = `/api/uploads/proxy?url=${encodedUrl}`;

    const res = await fetch(proxyUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!res.ok) {
      throw new FlowsApiError("Failed to upload file via proxy", res.status);
    }
  }

  async update(id: FlowId, flow: Flow): Promise<Flow> {
    const dto = mapFlowToDTO(flow);
    const res = await fetch(`${INTERNAL_API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new FlowsApiError(text || "Failed to update flow", res.status);
    }

    return (await res.json()) as Flow;
  }
}

/** Instancia por defecto para inyección simple */
export const flowsRepo: FlowsRepo = new FlowsHttpRepo();
