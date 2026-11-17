import { beforeEach, describe, expect, it, vi } from "vitest";
import { catalogRepo } from "../catalog.repo.impl";
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock("@shared/api/http.client", () => ({ httpClient: http }));
beforeEach(() => {
  vi.resetAllMocks();
});

describe("Catalog HTTP repository", () => {
  it("reads plain status JSON without synthesizing legacy metadata", async () => {
    const status = {
      active_version: "legacy",
      revision: "legacy:0",
      active: null,
      enabled: false,
    };
    http.get.mockResolvedValueOnce({ data: status });
    expect(await catalogRepo.status()).toEqual(status);
    expect(http.get).toHaveBeenCalledWith("/api/catalog/status");
  });
  it("requests pages of 20 and forwards the opaque cursor only when present", async () => {
    http.get.mockResolvedValue({ data: { items: [], next_cursor: null } });
    expect(await catalogRepo.versions()).toEqual({
      items: [],
      next_cursor: null,
    });
    expect(http.get).toHaveBeenLastCalledWith("/api/catalog/versions", {
      params: { limit: 20 },
    });
    await catalogRepo.versions("opaque+/cursor");
    expect(http.get).toHaveBeenLastCalledWith("/api/catalog/versions", {
      params: { limit: 20, cursor: "opaque+/cursor" },
    });
  });
  it("sends the validation file without performing a mutation", async () => {
    const file = { file_name: "catalog.xlsx", file_content: "UEsDBA==" };
    http.post.mockResolvedValueOnce({ data: { item_count: 1843 } });
    expect(await catalogRepo.validate(file)).toEqual({ item_count: 1843 });
    expect(http.post).toHaveBeenCalledWith("/api/catalog/validate", file);
    expect(http.post).toHaveBeenCalledTimes(1);
  });
  it.each(["upload", "activate"] as const)(
    "preserves %s identities and the running result",
    async (kind) => {
      const input = {
        file_name: "catalog.xlsx",
        file_content: "UEsDBA==",
        version: "previous",
        operation_id: "operation",
        expected_revision: "r1",
      };
      const operation = { status: "running", operation_id: "operation", kind };
      http.post.mockResolvedValueOnce({ data: operation });
      expect(await catalogRepo[kind](input)).toEqual(operation);
      expect(http.post).toHaveBeenCalledWith(`/api/catalog/${kind}`, input);
    },
  );
  it("encodes operation identifiers as one segment", async () => {
    http.get.mockResolvedValueOnce({ data: { status: "completed" } });
    expect(await catalogRepo.operation("op/next?x=1")).toEqual({
      status: "completed",
    });
    expect(http.get).toHaveBeenCalledWith(
      "/api/catalog/operations/op%2Fnext%3Fx%3D1",
    );
  });
  it("propagates normalized errors without retrying mutations", async () => {
    const error = { code: "NETWORK_ERROR", message: "Network disconnected" };
    http.post.mockRejectedValueOnce(error);
    await expect(
      catalogRepo.activate({
        version: "legacy",
        operation_id: "operation",
        expected_revision: "r2",
      }),
    ).rejects.toEqual(error);
    expect(http.post).toHaveBeenCalledTimes(1);
  });
});

it("uses asynchronous imports and preserves item filters plus cancellation", async () => {
  http.post.mockResolvedValueOnce({ data: { status: "queued" } });
  const input = { file_name: "file.xlsx", file_content: "encoded", operation_id: "op", expected_revision: "r1" };
  expect(await catalogRepo.imports(input)).toEqual({ status: "queued" });
  expect(http.post).toHaveBeenCalledWith("/api/catalog/imports", input);
  http.get.mockResolvedValueOnce({ data: { items: [], version: "v1", next_cursor: "more" } });
  const signal = new AbortController().signal;
  await catalogRepo.items({ version: "v1", q: "ramp", cursor: "next" }, signal);
  expect(http.get).toHaveBeenCalledWith("/api/catalog/items", { params: { version: "v1", q: "ramp", cursor: "next", limit: 50 }, signal });
  http.get.mockResolvedValueOnce({ data: { items: [], next_cursor: null } });
  await catalogRepo.operations("next");
  expect(http.get).toHaveBeenLastCalledWith("/api/catalog/operations", { params: { limit: 20, cursor: "next" } });
});

it("creates, renames, deletes one row and exports only a pinned version", async () => {
  const input = { operation_id: "op", base_version: "v1", expected_revision: "r1" };
  const item = { flow_id: "FLOW", barrier_id: "B1", question_code: "02", question: "Safe?", mitigation_id: "M1", barrier_statement: "Steps", proposed_mitigation: "Ramp", adas_reference: "ADA", cost: 0, unit: "each" };
  http.post.mockResolvedValue({ data: { status: "queued" } });
  http.put.mockResolvedValue({ data: { status: "queued" } });
  http.delete.mockResolvedValue({ data: { status: "queued" } });
  await catalogRepo.mutate({ ...input, kind: "create", item });
  expect(http.post).toHaveBeenLastCalledWith("/api/catalog/items", { ...input, item });
  const target = { flow_id: "Flow/entry", catalog_item_id: "B1#01" };
  await catalogRepo.mutate({ ...input, kind: "update", item, target });
  expect(http.put).toHaveBeenCalledWith("/api/catalog/items/Flow%2Fentry/B1%2301", { ...input, item });
  await catalogRepo.mutate({ ...input, kind: "delete", target });
  expect(http.delete).toHaveBeenCalledWith("/api/catalog/items/Flow%2Fentry/B1%2301", { data: input });
  await expect(catalogRepo.mutate({ ...input, kind: "delete" })).rejects.toThrow("identity");
  const blob = new Blob(["xlsx"], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  http.get.mockResolvedValueOnce({ data: blob });
  expect(await catalogRepo.export("v1")).toBe(blob);
  expect(http.get).toHaveBeenLastCalledWith("/api/catalog/export", { params: { version: "v1" }, responseType: "blob" });
});

it("preserves JSON export errors received as a blob and rejects unexpected success types", async () => {
  http.get.mockRejectedValueOnce({ code: "CONFLICT", message: "HTTP 409", details: { response: new Blob([JSON.stringify({ error: { message: "Version changed" } })], { type: "application/json" }) } });
  await expect(catalogRepo.export("v1")).rejects.toMatchObject({ message: "Version changed" });
  http.get.mockResolvedValueOnce({ data: new Blob(["bad"], { type: "text/plain" }) });
  await expect(catalogRepo.export("v1")).rejects.toMatchObject({ message: "Unexpected catalog export response" });
});
