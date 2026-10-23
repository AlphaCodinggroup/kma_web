import { beforeEach, describe, expect, it, vi } from "vitest";
import { catalogRepo } from "../catalog.repo.impl";
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
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
