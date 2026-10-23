import type {
  CatalogItemsQuery,
  CatalogItemsPage,
  CatalogOperationsPage,
  CatalogStatus,
  CatalogFile,
  CatalogPreview,
  CatalogOperation,
  CatalogIdentity,
  CatalogHistory,
} from "@entities/catalog/model/catalog";

export interface CatalogRepo {
  items(query: CatalogItemsQuery, signal?: AbortSignal): Promise<CatalogItemsPage>;
  operations(cursor?: string): Promise<CatalogOperationsPage>;
  imports(input: CatalogFile & CatalogIdentity): Promise<CatalogOperation>;
  status(): Promise<CatalogStatus>;
  versions(cursor?: string): Promise<CatalogHistory>;
  validate(file: CatalogFile): Promise<CatalogPreview>;
  upload(input: CatalogFile & CatalogIdentity): Promise<CatalogOperation>;
  activate(
    input: { version: string } & CatalogIdentity,
  ): Promise<CatalogOperation>;
  operation(id: string): Promise<CatalogOperation>;
}
