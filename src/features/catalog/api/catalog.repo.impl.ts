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
