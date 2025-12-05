import type { Facility, FacilityId } from "@entities/facility/model";
import type { FacilitiesRepo } from "@entities/facility/api/facilities.repo";
import { facilitiesRepoImpl } from "@features/facilities/api/facilities.repo.impl";

/**
 * Caso de uso: archivar una Facility por ID.
 */
export async function archiveFacilityUseCase(
  rawId: FacilityId,
  repo: FacilitiesRepo = facilitiesRepoImpl
): Promise<Facility> {
  const id = rawId?.trim();

  if (!id) {
    throw new Error("Facility id is required to archive");
  }

  return repo.archive(id);
}
