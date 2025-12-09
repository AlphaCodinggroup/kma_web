import type { FacilityUpsertValues } from "@features/facilities/ui/FacilityUpsertDialog";

/**
 * Campos opcionales que pueden enviarse al dominio al crear/editar una Facility.
 */
interface FacilityOptionalFields {
  address?: string;
  city?: string;
  description?: string;
  photoFile?: File | null;
  photoUrl?: string;
  clearPhoto?: boolean;
}

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

  if (values.description && values.description.trim().length > 0) {
    result.description = values.description;
  }

  if (values.clearPhoto && !values.photoFile) {
    result.clearPhoto = true;
  }

  if (values.photoFile) {
    result.photoFile = values.photoFile;
  }

  const trimmedPhotoUrl = values.photoUrl?.trim();
  if (!values.photoFile && trimmedPhotoUrl) {
    result.photoUrl = trimmedPhotoUrl;
  }

  return result;
}
