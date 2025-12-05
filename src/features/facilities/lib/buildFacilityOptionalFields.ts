import type { CreateFacilityParams } from "@entities/facility/model";
import type { FacilityUpsertValues } from "@features/facilities/ui/FacilityUpsertDialog";

/**
 * Campos opcionales que pueden enviarse al dominio al crear/editar una Facility.
 * La forma de los tipos viene del modelo de dominio (CreateFacilityParams).
 */
type FacilityOptionalFields = Partial<
  Pick<CreateFacilityParams, "address" | "city" | "notes">
>;

/**
 * Mapea los valores del formulario (UI) a los campos opcionales
 * válidos para el dominio, sin enviar `undefined`.
 */
export function buildFacilityOptionalFields(
  values: FacilityUpsertValues
): FacilityOptionalFields {
  const result: FacilityOptionalFields = {};

  if (values.address && values.address.trim().length > 0) {
    result.address = values.address;
  }

  if (values.city && values.city.trim().length > 0) {
    result.city = values.city;
  }

  if (values.notes && values.notes.trim().length > 0) {
    result.notes = values.notes;
  }

  return result;
}
