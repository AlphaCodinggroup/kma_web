import type { FacilityId } from "@entities/facility/model";
import type { FacilitiesRepo } from "@entities/facility/api/facilities.repo";
import { facilitiesRepoImpl } from "@features/facilities/api/facilities.repo.impl";

/**
 * Caso de uso: eliminar una Facility por ID.
 */
export async function deleteFacilityUseCase(
  rawId: FacilityId,
  repo: FacilitiesRepo = facilitiesRepoImpl
): Promise<void> {
  const id = rawId?.trim();

  if (!id) {
    throw new Error("Facility id is required to delete");
  }

  await repo.delete(id);
}
