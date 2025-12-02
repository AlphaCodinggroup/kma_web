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

  const params: CreateFacilityParams = {
    ...rawParams,
    name,
    address: rawParams.address?.trim() || undefined,
    city: rawParams.city?.trim() || undefined,
    notes: rawParams.notes?.trim() || undefined,
    status: "ACTIVE",
  };

  return repo.create(params);
}
