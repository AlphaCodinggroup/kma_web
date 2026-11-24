import type { FlowCategoriesRepo } from "@entities/flow/api/flow-categories.repo";
import type {
  CreateFlowCategoryInput,
  FlowCategory,
  FlowCategoryId,
  FlowCategoryList,
  UpdateFlowCategoryInput,
} from "@entities/flow/model";
import {
  mapCreateFlowCategoryToDTO,
  mapFlowCategoryDTO,
  mapFlowCategoryListDTO,
  mapUpdateFlowCategoryToDTO,
} from "@entities/flow/lib/mappers";
import { httpClient } from "@shared/api/http.client";
import { AxiosError } from "axios";
import {
  parseFlowCategoryDTO,
  parseFlowCategoryListDTO,
} from "./flows.dto";
import { FlowsApiError } from "./flows.repo.impl";

const CATEGORIES_API_URL = "/api/flows/categories";

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

function extractStatus(err: unknown): number | undefined {
  if (err instanceof AxiosError) {
    return err.response?.status;
  }
  return undefined;
}

export class FlowCategoriesHttpRepo implements FlowCategoriesRepo {
  async list(options?: { active?: boolean | undefined }): Promise<FlowCategoryList> {
    try {
      const params = options?.active !== undefined ? { active: String(options.active) } : undefined;
      const res = await httpClient.get<unknown>(CATEGORIES_API_URL, { params });
      try {
        const dto = parseFlowCategoryListDTO(res.data);
        return mapFlowCategoryListDTO(dto);
      } catch (err) {
        console.error("[FlowCategoriesHttpRepo] Validation Error", {
          error: err,
          rawResponse: res.data,
        });
        throw new FlowsApiError("Frontend validation failed. Check console.", 500);
      }
    } catch (err) {
      if (err instanceof FlowsApiError) throw err;
      throw new FlowsApiError(
        extractErrorMessage(err, "Failed to list flow categories"),
        extractStatus(err)
      );
    }
  }

  async getById(id: FlowCategoryId): Promise<FlowCategory | null> {
    try {
      const res = await httpClient.get<unknown>(`${CATEGORIES_API_URL}/${encodeURIComponent(id)}`);
      return mapFlowCategoryDTO(parseFlowCategoryDTO(res.data));
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 404) {
        return null;
      }
      if (err instanceof FlowsApiError) throw err;
      throw new FlowsApiError(
        extractErrorMessage(err, "Failed to get flow category"),
        extractStatus(err)
      );
    }
  }

  async create(input: CreateFlowCategoryInput): Promise<FlowCategory> {
    const payload = mapCreateFlowCategoryToDTO(input);
    try {
      const res = await httpClient.post<unknown>(CATEGORIES_API_URL, payload);
      return mapFlowCategoryDTO(parseFlowCategoryDTO(res.data));
    } catch (err) {
      if (err instanceof FlowsApiError) throw err;
      throw new FlowsApiError(
        extractErrorMessage(err, "Failed to create flow category"),
        extractStatus(err)
      );
    }
  }

  async update(id: FlowCategoryId, input: UpdateFlowCategoryInput): Promise<FlowCategory> {
    const payload = mapUpdateFlowCategoryToDTO(input);
    try {
      const res = await httpClient.put<unknown>(
        `${CATEGORIES_API_URL}/${encodeURIComponent(id)}`,
        payload
      );
      return mapFlowCategoryDTO(parseFlowCategoryDTO(res.data));
    } catch (err) {
      if (err instanceof FlowsApiError) throw err;
      throw new FlowsApiError(
        extractErrorMessage(err, "Failed to update flow category"),
        extractStatus(err)
      );
    }
  }

  async delete(id: FlowCategoryId, options?: { permanent?: boolean | undefined }): Promise<void> {
    try {
      const params = options?.permanent ? { permanent: "true" } : undefined;
      await httpClient.delete(`${CATEGORIES_API_URL}/${encodeURIComponent(id)}`, { params });
    } catch (err) {
      if (err instanceof FlowsApiError) throw err;
      throw new FlowsApiError(
        extractErrorMessage(err, "Failed to delete flow category"),
        extractStatus(err)
      );
    }
  }
}

export const flowCategoriesRepo: FlowCategoriesRepo = new FlowCategoriesHttpRepo();
