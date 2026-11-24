import { describe, expect, it, vi, beforeEach } from "vitest";
import { AxiosError } from "axios";

const { getMock, postMock, putMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("@shared/api/http.client", () => ({
  httpClient: {
    get: getMock,
    post: postMock,
    put: putMock,
    delete: deleteMock,
  },
}));

import { FlowCategoriesHttpRepo } from "../flow-categories.repo.impl";
import { FlowsApiError } from "../flows.repo.impl";

function axiosError(status: number, data: unknown) {
  const err = new AxiosError("Request failed");
  err.response = {
    status,
    data,
    statusText: "Error",
    headers: {},
    config: {} as never,
  };
  return err;
}

describe("FlowCategoriesHttpRepo", () => {
  const repo = new FlowCategoriesHttpRepo();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists categories and passes active query parameter when specified", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        categories: [
          {
            id: "cat-1",
            name: "Restrooms",
            description: "All restroom flows",
            is_active: true,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-02T00:00:00Z",
            created_by: "admin",
            updated_by: "admin",
          },
        ],
        total: 1,
      },
    });

    const result = await repo.list({ active: true });

    expect(getMock).toHaveBeenCalledWith("/api/flows/categories", {
      params: { active: "true" },
    });
    expect(result).toEqual({
      categories: [
        {
          id: "cat-1",
          name: "Restrooms",
          description: "All restroom flows",
          isActive: true,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-02T00:00:00Z",
          createdBy: "admin",
          updatedBy: "admin",
        },
      ],
      total: 1,
    });
  });

  it("wraps invalid list payloads in FlowsApiError(500)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getMock.mockResolvedValueOnce({ data: { invalid: true } });

    await expect(repo.list()).rejects.toMatchObject({
      name: "FlowsApiError",
      status: 500,
    });
    errorSpy.mockRestore();
  });

  it("normalizes axios errors on list", async () => {
    getMock.mockRejectedValueOnce(axiosError(503, { message: "Backend unavailable" }));
    await expect(repo.list()).rejects.toMatchObject({
      message: "Backend unavailable",
      status: 503,
    });
  });

  it("gets a category by id and returns null on 404", async () => {
    getMock.mockResolvedValueOnce({
      data: { id: "cat-1", name: "Doors", is_active: true },
    });
    expect(await repo.getById("cat-1")).toEqual({
      id: "cat-1",
      name: "Doors",
      isActive: true,
    });

    getMock.mockRejectedValueOnce(axiosError(404, { message: "Not found" }));
    expect(await repo.getById("missing")).toBeNull();
  });

  it("propagates non-404 errors on getById", async () => {
    getMock.mockRejectedValueOnce(axiosError(500, "Server boom"));
    await expect(repo.getById("cat-1")).rejects.toMatchObject({
      message: "Server boom",
      status: 500,
    });
  });

  it("creates a category with trimmed fields", async () => {
    postMock.mockResolvedValueOnce({
      data: { id: "cat-2", name: "Parking", description: "Lots", is_active: true },
    });

    const created = await repo.create({
      name: "  Parking  ",
      description: "  Lots  ",
      isActive: true,
    });

    expect(postMock).toHaveBeenCalledWith("/api/flows/categories", {
      name: "Parking",
      description: "Lots",
      is_active: true,
    });
    expect(created).toEqual({
      id: "cat-2",
      name: "Parking",
      description: "Lots",
      isActive: true,
    });
  });

  it("normalizes create errors", async () => {
    postMock.mockRejectedValueOnce(new Error("Network down"));
    await expect(repo.create({ name: "X" })).rejects.toBeInstanceOf(FlowsApiError);
  });

  it("updates a category and maps response", async () => {
    putMock.mockResolvedValueOnce({
      data: { id: "cat-1", name: "Updated", description: "Desc", is_active: false },
    });

    const updated = await repo.update("cat-1", {
      name: " Updated ",
      description: " Desc ",
      isActive: false,
    });

    expect(putMock).toHaveBeenCalledWith("/api/flows/categories/cat-1", {
      name: "Updated",
      description: "Desc",
      is_active: false,
    });
    expect(updated.isActive).toBe(false);
  });

  it("normalizes update errors", async () => {
    putMock.mockRejectedValueOnce("unknown failure");
    await expect(repo.update("cat-1", { name: "X" })).rejects.toMatchObject({
      message: "Failed to update flow category",
    });
  });

  it("deletes a category with optional permanent flag", async () => {
    deleteMock.mockResolvedValueOnce({});
    await repo.delete("cat-1");
    expect(deleteMock).toHaveBeenCalledWith("/api/flows/categories/cat-1", {
      params: undefined,
    });

    deleteMock.mockResolvedValueOnce({});
    await repo.delete("cat-1", { permanent: true });
    expect(deleteMock).toHaveBeenCalledWith("/api/flows/categories/cat-1", {
      params: { permanent: "true" },
    });
  });

  it("normalizes delete errors", async () => {
    deleteMock.mockRejectedValueOnce(axiosError(403, { message: "Forbidden" }));
    await expect(repo.delete("cat-1")).rejects.toMatchObject({
      message: "Forbidden",
      status: 403,
    });
  });
});
