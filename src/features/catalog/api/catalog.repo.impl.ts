import { normalizeCatalogError } from "./catalog-error";
import { httpClient } from "@shared/api/http.client";
import type { CatalogRepo } from "./catalog.repo";
import type {
  CatalogItemsPage,
  CatalogOperationsPage,
  CatalogStatus,
  CatalogPreview,
  CatalogHistory,
  CatalogOperation,
} from "@entities/catalog/model/catalog";

export const catalogRepo: CatalogRepo = {
  mutate: async ({ kind, target, ...input }) => {
    if (kind === "create") return (await httpClient.post<CatalogOperation>("/api/catalog/items", input)).data;
    if (!target) throw new Error("Catalog record identity is required");
    const path = `/api/catalog/items/${encodeURIComponent(target.flow_id)}/${encodeURIComponent(target.catalog_item_id)}`;
    return kind === "update" ? (await httpClient.put<CatalogOperation>(path, input)).data : (await httpClient.delete<CatalogOperation>(path, { data: input })).data;
  },
  export: async version => {
    try {
      const { data } = await httpClient.get<Blob>("/api/catalog/export", { params: { version }, responseType: "blob" });
      if (data.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") throw new Error("Unexpected catalog export response");
      return data;
    } catch (cause) {
      const error = normalizeCatalogError(cause);
      const details = error.details as { response?: unknown; raw?: unknown } | undefined;
      const blob = details?.response ?? details?.raw;
      if (blob instanceof Blob && blob.type.includes("application/json")) {
        try {
          const body = JSON.parse(await blob.text()) as { message?: string; error?: { message?: string } };
          const message = body.error?.message ?? body.message;
          if (message) throw { ...error, message };
        } catch (parsed) { if (!(parsed instanceof SyntaxError)) throw parsed; }
      }
      throw error;
    }
  },
  items: async (params, signal) => (await httpClient.get<CatalogItemsPage>("/api/catalog/items", { params: { limit: 50, ...params }, ...(signal ? { signal } : {}) })).data,
  operations: async (cursor) => (await httpClient.get<CatalogOperationsPage>("/api/catalog/operations", { params: { limit: 20, ...(cursor ? { cursor } : {}) } })).data,
  imports: async (input) => (await httpClient.post<CatalogOperation>("/api/catalog/imports", input)).data,
  status: async () =>
    (await httpClient.get<CatalogStatus>("/api/catalog/status")).data,
  versions: async (cursor) =>
    (
      await httpClient.get<CatalogHistory>("/api/catalog/versions", {
        params: { limit: 20, ...(cursor ? { cursor } : {}) },
      })
    ).data,
  validate: async (input) =>
    (await httpClient.post<CatalogPreview>("/api/catalog/validate", input))
      .data,
  upload: async (input) =>
    (await httpClient.post<CatalogOperation>("/api/catalog/upload", input))
      .data,
  activate: async (input) =>
    (await httpClient.post<CatalogOperation>("/api/catalog/activate", input))
      .data,
  operation: async (id) =>
    (
      await httpClient.get<CatalogOperation>(
        `/api/catalog/operations/${encodeURIComponent(id)}`,
      )
    ).data,
};
