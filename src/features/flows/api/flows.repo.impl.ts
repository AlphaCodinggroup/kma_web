import type { FlowsRepo } from "@entities/flow/api/flows.repo";
import type { Flow, FlowId, FlowList } from "@entities/flow/model";
import { parseFlowListDTO, FlowDTOSchema } from "./flows.dto";
import { mapFlowListDTO, mapFlowDTO, mapFlowToDTO } from "@entities/flow/lib/mappers";
import { httpClient } from "@shared/api/http.client";
import { AxiosError } from "axios";

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

/**
 * Helper to extract error message from Axios errors
 */
function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data;
    if (data && typeof data === "object" && "message" in data) {
      return String((data as { message: unknown }).message);
    }
    if (typeof data === "string" && data.length > 0) {
      return data;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

/**
 * Helper to extract status code from Axios errors
 */
function extractStatus(err: unknown): number | undefined {
  if (err instanceof AxiosError) {
    return err.response?.status;
  }
  return undefined;
}

export class FlowsHttpRepo implements FlowsRepo {
  async list(): Promise<FlowList> {
    try {
      const res = await httpClient.get<unknown>(`${INTERNAL_API_URL}/summary`);

      const raw = res.data;
      try {
        const dto = parseFlowListDTO(raw);
        const domain = mapFlowListDTO(dto);
        return domain;
      } catch (err) {
        console.error("[FlowsHttpRepo] Validation Error", {
          error: err,
          rawResponse: raw,
        });
        throw new FlowsApiError("Frontend validation failed. Check console.", 500);
      }
    } catch (err) {
      // If it's already a FlowsApiError, re-throw
      if (err instanceof FlowsApiError) throw err;

      const status = extractStatus(err);
      const message = extractErrorMessage(err, "Failed to list flows");
      throw new FlowsApiError(message, status);
    }
  }

  async getById(id: FlowId): Promise<Flow | null> {
    try {
      const res = await httpClient.get<unknown>(`${INTERNAL_API_URL}/${id}`);

      const raw = res.data;
      const dto = FlowDTOSchema.parse(raw);
      return mapFlowDTO(dto);
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 404) {
        return null;
      }
      if (err instanceof FlowsApiError) throw err;

      const status = extractStatus(err);
      const message = extractErrorMessage(err, "Failed to get flow");
      throw new FlowsApiError(message, status);
    }
  }

  async getPresignedUrl(fileName: string, fileType: string): Promise<{ uploadUrl: string; publicUrl: string }> {
    try {
      const res = await httpClient.post<{ uploadUrl: string; publicUrl: string }>(
        "/api/uploads/presigned",
        { fileName, fileType }
      );
      return res.data;
    } catch (err) {
      const status = extractStatus(err);
      const message = extractErrorMessage(err, "Failed to get presigned URL");
      throw new FlowsApiError(message, status);
    }
  }

  async uploadFile(uploadUrl: string, file: File): Promise<void> {
    const encodedUrl = btoa(uploadUrl);
    const proxyUrl = `/api/uploads/proxy?url=${encodedUrl}`;

    try {
      await httpClient.put(proxyUrl, file, {
        headers: {
          "Content-Type": file.type,
        },
      });
    } catch (err) {
      const status = extractStatus(err);
      const message = extractErrorMessage(err, "Failed to upload file via proxy");
      throw new FlowsApiError(message, status);
    }
  }

  async create(flow: Flow): Promise<Flow> {
    const dto = mapFlowToDTO(flow);
    console.log(JSON.stringify(dto));

    try {
      const res = await httpClient.post<Flow>(INTERNAL_API_URL, dto);
      return res.data;
    } catch (err) {
      const status = extractStatus(err);
      const message = extractErrorMessage(err, "Failed to create flow");
      throw new FlowsApiError(message, status);
    }
  }

  async update(id: FlowId, flow: Flow): Promise<Flow> {
    const dto = mapFlowToDTO(flow);

    try {
      const res = await httpClient.put<Flow>(`${INTERNAL_API_URL}/${id}`, dto);
      return res.data;
    } catch (err) {
      const status = extractStatus(err);
      const message = extractErrorMessage(err, "Failed to update flow");
      throw new FlowsApiError(message, status);
    }
  }

  async delete(id: FlowId): Promise<void> {
    try {
      await httpClient.delete(`${INTERNAL_API_URL}/${id}`);
    } catch (err) {
      const status = extractStatus(err);
      const message = extractErrorMessage(err, "Failed to delete flow");
      throw new FlowsApiError(message, status);
    }
  }
}

/** Instancia por defecto para inyección simple */
export const flowsRepo: FlowsRepo = new FlowsHttpRepo();
