import type { FacilityUpsertValues } from "@features/facilities/ui/FacilityUpsertDialog";

/**
 * Campos opcionales que pueden enviarse al dominio al crear/editar una Facility.
 */
interface FacilityOptionalFields {
  address?: string;
  city?: string;
  description?: string;
  notes?: string;
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

  // `!= null` y no truthy: un campo vaciado a propósito viaja como cadena
  // vacía para que el backend lo borre. Descartarlo hacía imposible limpiarlo,
  // y el usuario veía el cambio como aplicado.
  if (values.address != null) {
    result.address = values.address;
  }

  if (values.city != null) {
    result.city = values.city;
  }

  if (values.description != null) {
    result.description = values.description;
  }

  if (values.notes != null) {
    result.notes = values.notes;
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
