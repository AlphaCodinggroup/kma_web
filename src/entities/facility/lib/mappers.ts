import type { Facility, FacilityListPage } from "../model";

export interface FacilityDTO {
  facility_id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  geo?: { lat: number; lng: number } | null;
  description?: string | null;
  status: "ACTIVE" | "ARCHIVED";
  created_at: string;
  updated_at: string;
  created_by: string;
  project_id?: string | null;
  user_ids?: string[];
  updated_by?: string | null;
}


export interface FacilitiesResponseDTO {
  facilities: FacilityDTO[];
  total?: number;
  limit?: number | null;
  cursor?: string | null;
}

/**
 * Mapea el geo DTO → dominio.
 */
function mapGeoFromDTO(
  geo?: { lat: number; lng: number } | null
): Facility["geo"] {
  if (!geo) return undefined;
  return { lat: geo.lat, lng: geo.lng };
}

/**
 * Mapea un FacilityDTO al dominio Facility.
 */
export function mapFacilityFromDTO(dto: FacilityDTO): Facility {
  return {
    id: dto.facility_id,
    projectId: dto.project_id ?? "",
    name: dto.name,
    address: dto.address ?? undefined,
    city: dto.city ?? undefined,
    geo: mapGeoFromDTO(dto.geo),
    notes: dto.description ?? undefined,
    status: dto.status,
    userIds: dto.user_ids ?? [],
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    createdBy: dto.created_by,
    updatedBy: dto.updated_by ?? undefined,
  };
}

/**
 * Mapea la respuesta de Facilities al modelo de dominio paginado.
 */
export function mapFacilitiesListFromDTO(
  response: FacilitiesResponseDTO
): FacilityListPage {
  const { facilities, limit, cursor } = response;

  return {
    items: facilities.map(mapFacilityFromDTO),
    limit: typeof limit === "number" ? limit : undefined,
    cursor: cursor ?? undefined,
  };
}
