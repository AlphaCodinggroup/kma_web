export type CatalogVersion = {
  version: string;
  file_name: string;
  sha256: string;
  item_count: number | null;
  flow_count: number | null;
  uploaded_at: string | null;
  uploaded_by: string | null;
  status: "ready";
  active: boolean;
};
export type CatalogSample = {
  flow_code: string;
  barrier_id: string;
  question_code: string;
  question: string;
  cost: number | null;
  unit: string | null;
};
export type CatalogStatus = {
  active_version: string;
  revision: string;
  active: CatalogVersion | null;
  enabled: boolean;
  limits: {
    max_file_size: number;
    max_uncompressed_size: number;
    max_items: number;
    preview_size: number;
  };
};
export type CatalogFile = { file_name: string; file_content: string };
export type CatalogPreview = {
  file_name: string;
  sha256: string;
  item_count: number;
  flow_count: number;
  duplicate_count: 0;
  warnings: string[];
  sample: CatalogSample[];
  expected_revision: string;
};
export type CatalogIdentity = {
  operation_id: string;
  expected_revision: string;
};
export type CatalogOperation = {
  operation_id: string;
  kind: "upload" | "activate";
  status: "queued" | "running" | "completed" | "failed" | "conflict";
  message: string;
  processed_items?: number;
  total_items?: number;
  started_at?: string;
  version?: string;
  previous_version?: string;
  revision?: string;
  file_name?: string;
  uploaded_at?: string;
  item_count?: number;
  flow_count?: number;
  error?: string;
};
export type CatalogHistory = {
  items: CatalogVersion[];
  next_cursor: string | null;
};

export type CatalogItem = {
  catalog_item_id: string;
  flow_id: string | null;
  barrier_id: string | null;
  question_code: string | null;
  question: string | null;
  mitigation_id: string | null;
  barrier_statement: string | null;
  proposed_mitigation: string | null;
  adas_reference: string | null;
  cost: number | null;
  unit: string | null;
};
export type CatalogItemsQuery = {
  version?: string;
  q?: string;
  flow_id?: string;
  barrier_id?: string;
  cursor?: string;
  limit?: number;
};
export type CatalogItemsPage = { items: CatalogItem[]; version: string; next_cursor: string | null };
export type CatalogOperationsPage = { items: CatalogOperation[]; next_cursor: string | null };
