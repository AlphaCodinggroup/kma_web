import type {
  CreateFacilityParams,
  CreateFacilityResult,
} from "@entities/facility/model";
import type { FacilitiesRepo } from "@entities/facility/api/facilities.repo";
import { facilitiesRepoImpl } from "@features/facilities/api/facilities.repo.impl";

/**
 * Caso de uso: crear una nueva Facility.
 */
export async function createFacilityUseCase(
  rawParams: CreateFacilityParams,
  repo: FacilitiesRepo = facilitiesRepoImpl
): Promise<CreateFacilityResult> {
  const name = rawParams.name.trim();

  if (!name) {
    throw new Error("Facility name is required");
  }

  // Normalizamos campos opcionales
  const address = rawParams.address?.trim();
  const city = rawParams.city?.trim();
  const notes = rawParams.notes?.trim();

  const params: CreateFacilityParams = {
    ...rawParams,
    name,
    status: "ACTIVE",
    ...(address ? { address } : {}),
    ...(city ? { city } : {}),
    ...(notes ? { notes } : {}),
  };

  return repo.create(params);
}
