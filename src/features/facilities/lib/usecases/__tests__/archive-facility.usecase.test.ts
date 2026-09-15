// ---------------------------------------------------------------------------
// Tests for the archiveFacilityUseCase use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";

// La implementación HTTP se importa como valor por defecto del parámetro `repo`,
// así que hay que reemplazar el módulo antes de importar el caso de uso.
const defaultArchive = vi.fn();

vi.mock("@features/facilities/api/facilities.repo.impl", () => ({
  facilitiesRepoImpl: {
    getFacilities: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    archive: (...args: unknown[]) => defaultArchive(...args),
    restore: vi.fn(),
    getUploadSignedUrl: vi.fn(),
    uploadFile: vi.fn(),
  },
}));

import { archiveFacilityUseCase } from "../archive-facility.usecase";
import { makeFacility, makeFacilitiesRepo } from "./helpers";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("archiveFacilityUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["an empty id", ""],
    ["a whitespace-only id", "   "],
    ["undefined", undefined as unknown as string],
  ])("throws on %s", async (_label, id) => {
    const repo = makeFacilitiesRepo();

    await expect(archiveFacilityUseCase(id, repo)).rejects.toThrow(
      "Facility id is required to archive"
    );
    expect(repo.archive).not.toHaveBeenCalled();
  });

  it("trims the id before calling the repository", async () => {
    const facility = makeFacility({ status: "ARCHIVED" });
    const repo = makeFacilitiesRepo({
      archive: vi.fn().mockResolvedValue(facility),
    });

    await expect(
      archiveFacilityUseCase("  facility-1  ", repo)
    ).resolves.toBe(facility);
    expect(repo.archive).toHaveBeenCalledWith("facility-1");
  });

  it("propagates the repository error", async () => {
    const repo = makeFacilitiesRepo({
      archive: vi.fn().mockRejectedValue(new Error("already archived")),
    });

    await expect(archiveFacilityUseCase("facility-1", repo)).rejects.toThrow(
      "already archived"
    );
  });

  it("falls back to the default repository when none is given", async () => {
    const facility = makeFacility({ id: "facility-default" });
    defaultArchive.mockResolvedValue(facility);

    await expect(archiveFacilityUseCase("facility-default")).resolves.toBe(
      facility
    );
    expect(defaultArchive).toHaveBeenCalledWith("facility-default");
  });
});
