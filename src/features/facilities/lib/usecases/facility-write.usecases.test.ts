import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FacilitiesRepo } from "@entities/facility/api/facilities.repo";

vi.mock("@features/facilities/api/facilities.repo.impl", () => ({
  facilitiesRepoImpl: {},
}));

import { createFacilityUseCase } from "./create-facility.usecase";
import { updateFacilityUseCase } from "./update-facility.usecase";

const createdFacility = { id: "facility-1", name: "Main plant" };
const create = vi.fn().mockResolvedValue(createdFacility);
const update = vi.fn().mockResolvedValue(createdFacility);
const getUploadSignedUrl = vi.fn().mockResolvedValue({
  uploadUrl: "https://uploads.example/facility",
  publicUrl: "https://cdn.example/facility.jpg",
  key: "facility.jpg",
  expiresIn: 300,
});
const uploadFile = vi.fn().mockResolvedValue(undefined);
const repo = { create, update, getUploadSignedUrl, uploadFile } as unknown as FacilitiesRepo;

describe("facility write use cases", () => {
  beforeEach(() => {
    create.mockClear();
    update.mockClear();
    getUploadSignedUrl.mockClear();
    uploadFile.mockClear();
  });

  describe("createFacilityUseCase", () => {
    it("trims fields, defaults status and prefers description over notes", async () => {
      await expect(
        createFacilityUseCase(
          {
            name: "  Main plant  ",
            projectId: "project-1",
            address: "  1 Main St  ",
            city: "  Austin  ",
            description: "  Primary facility  ",
            notes: "  Internal note  ",
            geo: { lat: 1, lng: 2 },
          },
          repo
        )
      ).resolves.toBe(createdFacility);

      expect(create).toHaveBeenCalledWith({
        name: "Main plant",
        projectId: "project-1",
        address: "1 Main St",
        city: "Austin",
        description: "Primary facility",
        notes: "Internal note",
        status: "ACTIVE",
        geo: { lat: 1, lng: 2 },
      });
    });

    it("uses notes as the description fallback and keeps an explicit status", async () => {
      await createFacilityUseCase(
        { name: "Plant", notes: "Only notes", status: "ARCHIVED" },
        repo
      );
      expect(create).toHaveBeenCalledWith({
        name: "Plant",
        notes: "Only notes",
        description: "Only notes",
        status: "ARCHIVED",
      });
    });

    it("uses and validates a direct photo URL", async () => {
      await createFacilityUseCase(
        { name: "Plant", photoUrl: "  https://cdn.example/photo.jpg  " },
        repo
      );
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ photoUrl: "https://cdn.example/photo.jpg" })
      );
      await expect(
        createFacilityUseCase({ name: "Plant", photoUrl: "not a URL" }, repo)
      ).rejects.toThrow("Photo URL is invalid");
    });

    it("uploads a sanitized photo filename before creating", async () => {
      const file = new File(["image"], "# main photo.jpg", { type: "image/jpeg" });
      await createFacilityUseCase({ name: "Plant", photoFile: file }, repo);
      expect(getUploadSignedUrl).toHaveBeenCalledWith("mainphoto.jpg", "image/jpeg");
      expect(uploadFile).toHaveBeenCalledWith("https://uploads.example/facility", file);
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ photoUrl: "https://cdn.example/facility.jpg" })
      );
    });

    it("falls back to the binary content type for untyped files", async () => {
      const file = new File(["image"], "facility.bin");
      await createFacilityUseCase({ name: "Plant", photoFile: file }, repo);
      expect(getUploadSignedUrl).toHaveBeenCalledWith(
        "facility.bin",
        "application/octet-stream"
      );
    });

    it.each([
      ["", "Facility name is required"],
      ["ab", "Facility name must have at least 3 characters"],
      ["x".repeat(201), "Facility name must have at most 200 characters"],
    ])("rejects invalid names", async (name, message) => {
      await expect(createFacilityUseCase({ name }, repo)).rejects.toThrow(message);
      expect(create).not.toHaveBeenCalled();
    });

    it.each([
      [{ address: "x".repeat(501) }, "Address must have at most 500 characters"],
      [{ city: "x".repeat(101) }, "City must have at most 100 characters"],
      [{ description: "x".repeat(1001) }, "Description must have at most 1000 characters"],
      [{ notes: "x".repeat(1001) }, "Description must have at most 1000 characters"],
    ])("rejects oversized optional fields", async (fields, message) => {
      await expect(createFacilityUseCase({ name: "Plant", ...fields }, repo)).rejects.toThrow(
        message
      );
    });
  });

  describe("updateFacilityUseCase", () => {
    it("trims the id and supplied fields and forwards status and geo", async () => {
      await expect(
        updateFacilityUseCase(
          {
            id: "  facility-1  ",
            name: "  Updated plant  ",
            address: "  2 Main St  ",
            city: "  Dallas  ",
            description: "  Description  ",
            notes: "  Notes  ",
            status: "ARCHIVED",
            geo: { lat: 3, lng: 4 },
          },
          repo
        )
      ).resolves.toBe(createdFacility);
      expect(update).toHaveBeenCalledWith({
        id: "facility-1",
        name: "Updated plant",
        address: "2 Main St",
        city: "Dallas",
        description: "Description",
        notes: "Notes",
        status: "ARCHIVED",
        geo: { lat: 3, lng: 4 },
      });
    });

    it("omits blank optional strings", async () => {
      await updateFacilityUseCase(
        { id: "facility-1", address: " ", city: " ", description: " ", notes: " " },
        repo
      );
      expect(update).toHaveBeenCalledWith({ id: "facility-1" });
    });

    it("uploads a new photo and explicitly disables photo clearing", async () => {
      const file = new File(["image"], "new #photo", { type: "image/png" });
      await updateFacilityUseCase(
        { id: "facility-1", photoFile: file, clearPhoto: true },
        repo
      );
      expect(getUploadSignedUrl).toHaveBeenCalledWith("newphoto", "image/png");
      expect(uploadFile).toHaveBeenCalledWith("https://uploads.example/facility", file);
      expect(update).toHaveBeenCalledWith({
        id: "facility-1",
        photoUrl: "https://cdn.example/facility.jpg",
        clearPhoto: false,
      });
    });

    it("accepts a direct photo URL or an explicit clear operation", async () => {
      await updateFacilityUseCase(
        { id: "facility-1", photoUrl: "https://cdn.example/direct.jpg" },
        repo
      );
      expect(update).toHaveBeenLastCalledWith({
        id: "facility-1",
        photoUrl: "https://cdn.example/direct.jpg",
      });

      await updateFacilityUseCase({ id: "facility-1", clearPhoto: true }, repo);
      expect(update).toHaveBeenLastCalledWith({ id: "facility-1", clearPhoto: true });
    });

    it("rejects an invalid direct photo URL", async () => {
      await expect(
        updateFacilityUseCase({ id: "facility-1", photoUrl: "invalid" }, repo)
      ).rejects.toThrow("Photo URL is invalid");
    });

    it.each([
      [{ id: "" }, "Facility id is required"],
      [{ id: "facility-1", name: " " }, "Facility name cannot be empty"],
      [{ id: "facility-1", name: "ab" }, "Facility name must have at least 3 characters"],
      [
        { id: "facility-1", name: "x".repeat(201) },
        "Facility name must have at most 200 characters",
      ],
      [
        { id: "facility-1", address: "x".repeat(501) },
        "Address must have at most 500 characters",
      ],
      [{ id: "facility-1", city: "x".repeat(101) }, "City must have at most 100 characters"],
      [
        { id: "facility-1", description: "x".repeat(1001) },
        "Description must have at most 1000 characters",
      ],
      [
        { id: "facility-1", notes: "x".repeat(1001) },
        "Notes must have at most 1000 characters",
      ],
    ])("rejects invalid update values", async (input, message) => {
      await expect(updateFacilityUseCase(input, repo)).rejects.toThrow(message);
      expect(update).not.toHaveBeenCalled();
    });
  });
});
