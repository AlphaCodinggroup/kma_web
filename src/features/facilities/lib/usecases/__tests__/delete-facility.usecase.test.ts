// ---------------------------------------------------------------------------
// Tests for the deleteFacilityUseCase use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";

const defaultDelete = vi.fn();

vi.mock("@features/facilities/api/facilities.repo.impl", () => ({
  facilitiesRepoImpl: {
    getFacilities: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: (...args: unknown[]) => defaultDelete(...args),
    archive: vi.fn(),
    restore: vi.fn(),
    getUploadSignedUrl: vi.fn(),
    uploadFile: vi.fn(),
  },
}));

import { deleteFacilityUseCase } from "../delete-facility.usecase";
import { makeFacilitiesRepo } from "./helpers";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("deleteFacilityUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["an empty id", ""],
    ["a whitespace-only id", "  "],
    ["undefined", undefined as unknown as string],
  ])("throws on %s", async (_label, id) => {
    const repo = makeFacilitiesRepo();

    await expect(deleteFacilityUseCase(id, repo)).rejects.toThrow(
      "Facility id is required to delete"
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("trims the id before calling the repository", async () => {
    const repo = makeFacilitiesRepo({
      delete: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      deleteFacilityUseCase("  facility-1  ", repo)
    ).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith("facility-1");
  });

  it("propagates the repository error", async () => {
    const repo = makeFacilitiesRepo({
      delete: vi.fn().mockRejectedValue(new Error("still referenced")),
    });

    await expect(deleteFacilityUseCase("facility-1", repo)).rejects.toThrow(
      "still referenced"
    );
  });

  it("falls back to the default repository when none is given", async () => {
    defaultDelete.mockResolvedValue(undefined);

    await deleteFacilityUseCase("facility-default");

    expect(defaultDelete).toHaveBeenCalledWith("facility-default");
  });
});
