// ---------------------------------------------------------------------------
// Tests for the updateFacilityUseCase use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";

const defaultUpdate = vi.fn();

vi.mock("@features/facilities/api/facilities.repo.impl", () => ({
  facilitiesRepoImpl: {
    getFacilities: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: (...args: unknown[]) => defaultUpdate(...args),
    delete: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
    getUploadSignedUrl: vi.fn(),
    uploadFile: vi.fn(),
  },
}));

import { updateFacilityUseCase } from "../update-facility.usecase";
import type { UpdateFacilityInput } from "../update-facility.usecase";
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
  overrides: Partial<UpdateFacilityInput> = {}
): UpdateFacilityInput {
  return { id: "facility-1", ...overrides };
}

function repoThatUpdates() {
  return makeFacilitiesRepo({
    update: vi.fn().mockResolvedValue(makeFacility()),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("updateFacilityUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Validación --------------------------------------------------------

  it.each<[string, Partial<UpdateFacilityInput>, string]>([
    ["the id is empty", { id: "" }, "Facility id is required"],
    ["the id is only whitespace", { id: "   " }, "Facility id is required"],
    [
      "the id is undefined",
      { id: undefined as unknown as string },
      "Facility id is required",
    ],
    ["the name is blank", { name: "  " }, "Facility name cannot be empty"],
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
      "the notes are longer than 1000 characters",
      { notes: "a".repeat(1001) },
      "Notes must have at most 1000 characters",
    ],
    [
      "the photo url is malformed",
      { photoUrl: "not-a-url" },
      "Photo URL is invalid",
    ],
  ])("throws when %s", async (_label, overrides, message) => {
    const repo = makeFacilitiesRepo();

    await expect(
      updateFacilityUseCase(makeInput(overrides), repo)
    ).rejects.toThrow(message);
    expect(repo.update).not.toHaveBeenCalled();
  });

  // ---- Payload mínimo ----------------------------------------------------

  it("sends only the trimmed id when nothing else changes", async () => {
    const facility = makeFacility();
    const repo = makeFacilitiesRepo({
      update: vi.fn().mockResolvedValue(facility),
    });

    await expect(
      updateFacilityUseCase(makeInput({ id: "  facility-1  " }), repo)
    ).resolves.toBe(facility);
    expect(repo.update).toHaveBeenCalledWith({ id: "facility-1" });
  });

  it("trims every provided text field", async () => {
    const repo = repoThatUpdates();

    await updateFacilityUseCase(
      makeInput({
        name: "  New name  ",
        address: "  Main st. 1  ",
        city: "  Austin  ",
        description: "  A description  ",
        notes: "  Some notes  ",
      }),
      repo
    );

    expect(repo.update).toHaveBeenCalledWith({
      id: "facility-1",
      name: "New name",
      address: "Main st. 1",
      city: "Austin",
      description: "A description",
      notes: "Some notes",
    });
  });

  // Vaciar un campo opcional tiene que borrarlo: omitirlo del payload hacía que
  // el backend conservara el valor viejo mientras la UI daba el cambio por hecho.
  it.each<[string, Partial<UpdateFacilityInput>, string]>([
    ["an emptied address", { address: "   " }, "address"],
    ["an emptied city", { city: "" }, "city"],
    ["an emptied description", { description: "  " }, "description"],
    ["an emptied notes", { notes: "" }, "notes"],
  ])("forwards %s so the backend clears it", async (_label, overrides, field) => {
    const repo = repoThatUpdates();

    await updateFacilityUseCase(makeInput(overrides), repo);

    expect(repo.update).toHaveBeenCalledWith({
      id: "facility-1",
      [field]: "",
    });
  });

  it("forwards status and geo when provided", async () => {
    const repo = repoThatUpdates();
    const geo = { lat: 30.26, lng: -97.74 };

    await updateFacilityUseCase(
      makeInput({ status: "ARCHIVED", geo }),
      repo
    );

    expect(repo.update).toHaveBeenCalledWith({
      id: "facility-1",
      status: "ARCHIVED",
      geo,
    });
  });

  // ---- Foto --------------------------------------------------------------

  it("uploads a new photo file and disables clearPhoto", async () => {
    const signature = makeSignature();
    const repo = makeFacilitiesRepo({
      update: vi.fn().mockResolvedValue(makeFacility()),
      getUploadSignedUrl: vi.fn().mockResolvedValue(signature),
      uploadFile: vi.fn().mockResolvedValue(undefined),
    });
    const photoFile = makeFile("new photo#2.png", "image/png");

    await updateFacilityUseCase(
      makeInput({ photoFile, clearPhoto: true }),
      repo
    );

    expect(repo.getUploadSignedUrl).toHaveBeenCalledWith(
      "newphoto2.png",
      "image/png"
    );
    expect(repo.uploadFile).toHaveBeenCalledWith(signature.uploadUrl, photoFile);
    expect(repo.update).toHaveBeenCalledWith({
      id: "facility-1",
      photoUrl: signature.publicUrl,
      clearPhoto: false,
    });
  });

  it("falls back to a generic content type when the file has none", async () => {
    const repo = makeFacilitiesRepo({
      update: vi.fn().mockResolvedValue(makeFacility()),
      getUploadSignedUrl: vi.fn().mockResolvedValue(makeSignature()),
      uploadFile: vi.fn().mockResolvedValue(undefined),
    });

    await updateFacilityUseCase(
      makeInput({ photoFile: makeFile("plain.bin", "") }),
      repo
    );

    expect(repo.getUploadSignedUrl).toHaveBeenCalledWith(
      "plain.bin",
      "application/octet-stream"
    );
  });

  it("keeps a valid photo url when there is no file", async () => {
    const repo = repoThatUpdates();

    await updateFacilityUseCase(
      makeInput({ photoUrl: "  https://cdn.test/a.png  " }),
      repo
    );

    expect(repo.update).toHaveBeenCalledWith({
      id: "facility-1",
      photoUrl: "https://cdn.test/a.png",
    });
  });

  it("clears the photo when requested and nothing else is provided", async () => {
    const repo = repoThatUpdates();

    await updateFacilityUseCase(makeInput({ clearPhoto: true }), repo);

    expect(repo.update).toHaveBeenCalledWith({
      id: "facility-1",
      clearPhoto: true,
    });
  });

  it("ignores clearPhoto when a photo url is provided", async () => {
    const repo = repoThatUpdates();

    await updateFacilityUseCase(
      makeInput({ clearPhoto: true, photoUrl: "https://cdn.test/a.png" }),
      repo
    );

    expect(repo.update).toHaveBeenCalledWith({
      id: "facility-1",
      photoUrl: "https://cdn.test/a.png",
    });
  });

  it("propagates an upload failure", async () => {
    const repo = makeFacilitiesRepo({
      getUploadSignedUrl: vi.fn().mockResolvedValue(makeSignature()),
      uploadFile: vi.fn().mockRejectedValue(new Error("upload failed")),
    });

    await expect(
      updateFacilityUseCase(makeInput({ photoFile: makeFile() }), repo)
    ).rejects.toThrow("upload failed");
    expect(repo.update).not.toHaveBeenCalled();
  });

  // ---- Errores del repositorio -------------------------------------------

  it("propagates the repository error", async () => {
    const repo = makeFacilitiesRepo({
      update: vi.fn().mockRejectedValue(new Error("not found")),
    });

    await expect(updateFacilityUseCase(makeInput(), repo)).rejects.toThrow(
      "not found"
    );
  });

  it("falls back to the default repository when none is given", async () => {
    const facility = makeFacility({ id: "facility-default" });
    defaultUpdate.mockResolvedValue(facility);

    await expect(
      updateFacilityUseCase(makeInput({ id: "facility-default" }))
    ).resolves.toBe(facility);
    expect(defaultUpdate).toHaveBeenCalledWith({ id: "facility-default" });
  });
});
