import type {
  CreateFacilityParams,
  CreateFacilityResult,
} from "@entities/facility/model";
import type { FacilitiesRepo } from "@entities/facility/api/facilities.repo";
import { facilitiesRepoImpl } from "@features/facilities/api/facilities.repo.impl";

export type CreateFacilityInput = CreateFacilityParams & {
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
 * Caso de uso: crear una nueva Facility.
 */
export async function createFacilityUseCase(
  rawParams: CreateFacilityInput,
  repo: FacilitiesRepo = facilitiesRepoImpl
): Promise<CreateFacilityResult> {
  const name = rawParams.name.trim();

  if (!name) {
    throw new Error("Facility name is required");
  }
  if (name.length < 3) {
    throw new Error("Facility name must have at least 3 characters");
  }
  if (name.length > 200) {
    throw new Error("Facility name must have at most 200 characters");
  }

  // Normalizamos campos opcionales
  const address = rawParams.address?.trim();
  const city = rawParams.city?.trim();
  const description = rawParams.description?.trim();
  const notes = rawParams.notes?.trim();
  const status = rawParams.status ?? "ACTIVE";

  if (address && address.length > 500) {
    throw new Error("Address must have at most 500 characters");
  }

  if (city && city.length > 100) {
    throw new Error("City must have at most 100 characters");
  }

  const descriptionToSend = description ?? notes;
  if (descriptionToSend && descriptionToSend.length > 1000) {
    throw new Error("Description must have at most 1000 characters");
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

  const params: CreateFacilityParams = {
    name,
    status,
    ...(rawParams.projectId ? { projectId: rawParams.projectId } : {}),
    ...(address ? { address } : {}),
    ...(city ? { city } : {}),
    ...(descriptionToSend ? { description: descriptionToSend } : {}),
    ...(notes ? { notes } : {}),
    ...(photoUrl ? { photoUrl } : {}),
    ...(rawParams.geo ? { geo: rawParams.geo } : {}),
  };

  return repo.create(params);
}
