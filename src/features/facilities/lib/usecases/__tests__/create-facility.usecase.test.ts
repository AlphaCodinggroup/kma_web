// ---------------------------------------------------------------------------
// Tests for the createFacilityUseCase use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";

const defaultCreate = vi.fn();

vi.mock("@features/facilities/api/facilities.repo.impl", () => ({
  facilitiesRepoImpl: {
    getFacilities: vi.fn(),
    getById: vi.fn(),
    create: (...args: unknown[]) => defaultCreate(...args),
    update: vi.fn(),
    delete: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
    getUploadSignedUrl: vi.fn(),
    uploadFile: vi.fn(),
  },
}));

import { createFacilityUseCase } from "../create-facility.usecase";
import type { CreateFacilityInput } from "../create-facility.usecase";
import {
  makeFacilitiesRepo,
  makeFacility,
  makeFile,
  makeSignature,
} from "./helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInput(
  overrides: Partial<CreateFacilityInput> = {}
): CreateFacilityInput {
  return { name: "Facility 1", ...overrides };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createFacilityUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Validación --------------------------------------------------------

  it.each<[string, Partial<CreateFacilityInput>, string]>([
    ["the name is empty", { name: "" }, "Facility name is required"],
    [
      "the name is only whitespace",
      { name: "   " },
      "Facility name is required",
    ],
    [
      "the name is shorter than 3 characters",
      { name: "ab" },
      "Facility name must have at least 3 characters",
    ],
    [
      "the name is longer than 200 characters",
      { name: "a".repeat(201) },
      "Facility name must have at most 200 characters",
    ],
    [
      "the address is longer than 500 characters",
      { address: "a".repeat(501) },
      "Address must have at most 500 characters",
    ],
    [
      "the city is longer than 100 characters",
      { city: "a".repeat(101) },
      "City must have at most 100 characters",
    ],
    [
      "the description is longer than 1000 characters",
      { description: "a".repeat(1001) },
      "Description must have at most 1000 characters",
    ],
    [
      "the notes fall back as description and exceed 1000 characters",
      { notes: "a".repeat(1001) },
      "Description must have at most 1000 characters",
    ],
    [
      "the photo url is malformed",
      { photoUrl: "not-a-url" },
      "Photo URL is invalid",
    ],
  ])("throws when %s", async (_label, overrides, message) => {
    const repo = makeFacilitiesRepo();

    await expect(
      createFacilityUseCase(makeInput(overrides), repo)
    ).rejects.toThrow(message);
    expect(repo.create).not.toHaveBeenCalled();
  });

  // ---- Camino feliz ------------------------------------------------------

  it("defaults the status to ACTIVE and sends only the name", async () => {
    const facility = makeFacility();
    const repo = makeFacilitiesRepo({
      create: vi.fn().mockResolvedValue(facility),
    });

    await expect(createFacilityUseCase(makeInput(), repo)).resolves.toBe(
      facility
    );
    expect(repo.create).toHaveBeenCalledWith({
      name: "Facility 1",
      status: "ACTIVE",
    });
  });

  it("trims every optional text field", async () => {
    const repo = makeFacilitiesRepo({
      create: vi.fn().mockResolvedValue(makeFacility()),
    });

    await createFacilityUseCase(
      makeInput({
        name: "  Facility 1  ",
        address: "  Main st. 1  ",
        city: "  Austin  ",
        description: "  A description  ",
        notes: "  Some notes  ",
      }),
      repo
    );

    expect(repo.create).toHaveBeenCalledWith({
      name: "Facility 1",
      status: "ACTIVE",
      address: "Main st. 1",
      city: "Austin",
      description: "A description",
      notes: "Some notes",
    });
  });

  it("uses the notes as description when there is no description", async () => {
    const repo = makeFacilitiesRepo({
      create: vi.fn().mockResolvedValue(makeFacility()),
    });

    await createFacilityUseCase(makeInput({ notes: "Fallback" }), repo);

    expect(repo.create).toHaveBeenCalledWith({
      name: "Facility 1",
      status: "ACTIVE",
      description: "Fallback",
      notes: "Fallback",
    });
  });

  it("keeps projectId, geo and an explicit status", async () => {
    const repo = makeFacilitiesRepo({
      create: vi.fn().mockResolvedValue(makeFacility()),
    });
    const geo = { lat: 30.26, lng: -97.74 };

    await createFacilityUseCase(
      makeInput({ projectId: "project-9", geo, status: "ARCHIVED" }),
      repo
    );

    expect(repo.create).toHaveBeenCalledWith({
      name: "Facility 1",
      status: "ARCHIVED",
      projectId: "project-9",
      geo,
    });
  });

  it("accepts a valid photo url as is", async () => {
    const repo = makeFacilitiesRepo({
      create: vi.fn().mockResolvedValue(makeFacility()),
    });

    await createFacilityUseCase(
      makeInput({ photoUrl: "  https://cdn.test/a.png  " }),
      repo
    );

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ photoUrl: "https://cdn.test/a.png" })
    );
    expect(repo.getUploadSignedUrl).not.toHaveBeenCalled();
  });

  // ---- Subida de foto ----------------------------------------------------

  it("uploads the photo file and stores the public url", async () => {
    const signature = makeSignature();
    const repo = makeFacilitiesRepo({
      create: vi.fn().mockResolvedValue(makeFacility()),
      getUploadSignedUrl: vi.fn().mockResolvedValue(signature),
      uploadFile: vi.fn().mockResolvedValue(undefined),
    });
    const photoFile = makeFile("my photo#1.png", "image/png");

    await createFacilityUseCase(makeInput({ photoFile }), repo);

    // El nombre se sanea para no romper la URL pública de S3.
    expect(repo.getUploadSignedUrl).toHaveBeenCalledWith(
      "myphoto1.png",
      "image/png"
    );
    expect(repo.uploadFile).toHaveBeenCalledWith(signature.uploadUrl, photoFile);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ photoUrl: signature.key })
    );
  });

  it("falls back to a generic content type when the file has none", async () => {
    const repo = makeFacilitiesRepo({
      create: vi.fn().mockResolvedValue(makeFacility()),
      getUploadSignedUrl: vi.fn().mockResolvedValue(makeSignature()),
      uploadFile: vi.fn().mockResolvedValue(undefined),
    });

    await createFacilityUseCase(
      makeInput({ photoFile: makeFile("plain.bin", "") }),
      repo
    );

    expect(repo.getUploadSignedUrl).toHaveBeenCalledWith(
      "plain.bin",
      "application/octet-stream"
    );
  });

  it("prefers the uploaded file over an invalid photo url", async () => {
    const signature = makeSignature();
    const repo = makeFacilitiesRepo({
      create: vi.fn().mockResolvedValue(makeFacility()),
      getUploadSignedUrl: vi.fn().mockResolvedValue(signature),
      uploadFile: vi.fn().mockResolvedValue(undefined),
    });

    await createFacilityUseCase(
      makeInput({ photoFile: makeFile(), photoUrl: "not-a-url" }),
      repo
    );

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ photoUrl: signature.key })
    );
  });

  it("propagates an upload failure", async () => {
    const repo = makeFacilitiesRepo({
      getUploadSignedUrl: vi.fn().mockResolvedValue(makeSignature()),
      uploadFile: vi.fn().mockRejectedValue(new Error("upload failed")),
    });

    await expect(
      createFacilityUseCase(makeInput({ photoFile: makeFile() }), repo)
    ).rejects.toThrow("upload failed");
    expect(repo.create).not.toHaveBeenCalled();
  });

  // ---- Errores del repositorio -------------------------------------------

  it("propagates the repository error", async () => {
    const repo = makeFacilitiesRepo({
      create: vi.fn().mockRejectedValue(new Error("duplicated")),
    });

    await expect(createFacilityUseCase(makeInput(), repo)).rejects.toThrow(
      "duplicated"
    );
  });

  it("falls back to the default repository when none is given", async () => {
    const facility = makeFacility({ id: "facility-default" });
    defaultCreate.mockResolvedValue(facility);

    await expect(createFacilityUseCase(makeInput())).resolves.toBe(facility);
    expect(defaultCreate).toHaveBeenCalledWith({
      name: "Facility 1",
      status: "ACTIVE",
    });
  });
});
