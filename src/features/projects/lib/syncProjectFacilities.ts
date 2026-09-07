import { updateFacilityUseCase } from "@features/facilities/lib/usecases/update-facility.usecase";

export type SyncProjectFacilitiesParams = {
  projectId: string;
  /** Facilities que quedaron seleccionadas en el diálogo. */
  selectedIds: string[];
  /** Facilities que el proyecto tenía antes de guardar. */
  previousIds?: string[];
};

/**
 * Sincroniza las facilities de un proyecto.
 *
 * La relación vive en el `project_id` de la facility, que es la única fuente:
 * el proyecto ya no guarda su propia lista, así que asignar desde el diálogo
 * del proyecto se escribe sobre cada facility. Las que se destildan quedan sin
 * proyecto.
 */
export async function syncProjectFacilities(
  params: SyncProjectFacilitiesParams
): Promise<void> {
  const projectId = params.projectId?.trim();
  if (!projectId) {
    throw new Error("syncProjectFacilities: projectId is required");
  }

  const selected = new Set(params.selectedIds);
  const previous = new Set(params.previousIds ?? []);

  const assigned = params.selectedIds.filter((id) => id && !previous.has(id));
  const unassigned = [...previous].filter((id) => id && !selected.has(id));

  // Se escriben en paralelo: son facilities distintas y no compiten entre sí.
  await Promise.all([
    ...assigned.map((id) => updateFacilityUseCase({ id, projectId })),
    ...unassigned.map((id) => updateFacilityUseCase({ id, projectId: null })),
  ]);
}
