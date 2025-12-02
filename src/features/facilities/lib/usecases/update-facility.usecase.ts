import type {
  UpdateFacilityParams,
  UpdateFacilityResult,
} from "@entities/facility/model";
import type { FacilitiesRepo } from "@entities/facility/api/facilities.repo";
import { facilitiesRepoImpl } from "@features/facilities/api/facilities.repo.impl";

/**
 * Caso de uso: actualizar una Facility existente.
 */
export async function updateFacilityUseCase(
  rawParams: UpdateFacilityParams,
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
    payload.name = trimmed;
  }

  if (rawParams.address !== undefined) {
    const trimmed = rawParams.address.trim();
    if (trimmed) {
      payload.address = trimmed;
    }
  }

  if (rawParams.city !== undefined) {
    const trimmed = rawParams.city.trim();
    if (trimmed) {
      payload.city = trimmed;
    }
  }

  if (rawParams.notes !== undefined) {
    const trimmed = rawParams.notes.trim();
    if (trimmed) {
      payload.notes = trimmed;
    }
  }

  if (rawParams.status !== undefined) {
    payload.status = rawParams.status;
  }

  if (rawParams.geo !== undefined) {
    payload.geo = rawParams.geo;
  }

  return repo.update(payload);
}
