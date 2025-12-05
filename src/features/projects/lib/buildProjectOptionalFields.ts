import type { CreateProjectParams } from "@entities/projects/model";
import type { ProjectUpsertValues } from "../ui/ProjectsUpsertDialog";

/**
 * Campos opcionales que pueden enviarse al dominio al crear/editar un proyecto.
 */
type ProjectOptionalFields = Partial<Pick<CreateProjectParams, "description">>;

/**
 * Mapea los valores del formulario (UI) a los campos opcionales
 * válidos para el dominio, evitando mandar `undefined`.
 */
export function buildProjectOptionalFields(
  values: ProjectUpsertValues | (ProjectUpsertValues & { id: string })
): ProjectOptionalFields {
  const result: ProjectOptionalFields = {};

  if (values.description && values.description.trim().length > 0) {
    result.description = values.description;
  }

  return result;
}
