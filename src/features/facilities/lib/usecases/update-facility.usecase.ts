import type {
  UpdateFacilityParams,
  UpdateFacilityResult,
} from "@entities/facility/model";
import type { FacilitiesRepo } from "@entities/facility/api/facilities.repo";
import { facilitiesRepoImpl } from "@features/facilities/api/facilities.repo.impl";

export type UpdateFacilityInput = UpdateFacilityParams & {
  photoFile?: File | null;
  photoUrl?: string | null;
};

function assertValidUrl(url: string): void {
  try {
    // eslint-disable-next-line no-new
    new URL(url);
  } catch {
    throw new Error("Photo URL is invalid");
  }
}

/**
 * Caso de uso: actualizar una Facility existente.
 */
export async function updateFacilityUseCase(
  rawParams: UpdateFacilityInput,
  repo: FacilitiesRepo = facilitiesRepoImpl
): Promise<UpdateFacilityResult> {
  const id = rawParams.id?.trim();
  if (!id) {
    throw new Error("Facility id is required");
  }

  const payload: UpdateFacilityParams = { id };

  if (rawParams.name !== undefined) {
    const trimmed = rawParams.name.trim();
    if (!trimmed) {
      throw new Error("Facility name cannot be empty");
    }
    if (trimmed.length < 3) {
      throw new Error("Facility name must have at least 3 characters");
    }
    if (trimmed.length > 200) {
      throw new Error("Facility name must have at most 200 characters");
    }
    payload.name = trimmed;
  }

  if (rawParams.address !== undefined) {
    const trimmed = rawParams.address.trim();
    if (trimmed && trimmed.length > 500) {
      throw new Error("Address must have at most 500 characters");
    }
    if (trimmed) {
      payload.address = trimmed;
    }
  }

  if (rawParams.city !== undefined) {
    const trimmed = rawParams.city.trim();
    if (trimmed && trimmed.length > 100) {
      throw new Error("City must have at most 100 characters");
    }
    if (trimmed) {
      payload.city = trimmed;
    }
  }

  if (rawParams.description !== undefined) {
    const trimmed = rawParams.description.trim();
    if (trimmed && trimmed.length > 1000) {
      throw new Error("Description must have at most 1000 characters");
    }
    if (trimmed) {
      payload.description = trimmed;
    }
  }

  if (rawParams.notes !== undefined) {
    const trimmed = rawParams.notes.trim();
    if (trimmed && trimmed.length > 1000) {
      throw new Error("Notes must have at most 1000 characters");
    }
    if (trimmed) {
      payload.notes = trimmed;
    }
  }

  let photoUrl = rawParams.photoUrl?.trim() ?? undefined;
  if (rawParams.photoFile) {
    const file = rawParams.photoFile;
    const contentType = file.type || "application/octet-stream";
    const signature = await repo.getUploadSignedUrl(file.name, contentType);
    await repo.uploadFile(signature.uploadUrl, file);
    photoUrl = signature.publicUrl;
  } else if (photoUrl) {
    assertValidUrl(photoUrl);
  }

  if (photoUrl) {
    payload.photoUrl = photoUrl;
  }

  if (rawParams.status !== undefined) {
    payload.status = rawParams.status;
  }

  if (rawParams.geo !== undefined) {
    payload.geo = rawParams.geo;
  }

  return repo.update(payload);
}
