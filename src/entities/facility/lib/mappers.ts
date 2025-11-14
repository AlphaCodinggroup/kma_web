import type { Facility, FacilityListPage } from "../model";

export interface FacilityDTO {
  facility_id: string;
  project_id: string;
  name: string;
  address?: string;
  city?: string;
  geo?: { lat: number; lng: number };
  notes?: string;
  status: "ACTIVE" | "ARCHIVED";
  user_ids: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

export interface FacilitiesResponseDTO {
  data: {
    facilities: FacilityDTO[];
    limit?: number;
    cursor?: string;
  };
  status: string;
}

/**
 * Mapea un FacilityDTO al dominio Facility
 */
export function mapFacilityFromDTO(dto: FacilityDTO): Facility {
  return {
    id: dto.facility_id,
    projectId: dto.project_id,
    name: dto.name,
    address: dto.address ?? "",
    city: dto.city ?? "",
    geo: dto.geo ? { lat: dto.geo.lat, lng: dto.geo.lng } : { lat: 0, lng: 0 },
    notes: dto.notes ?? "",
    status: dto.status,
    userIds: dto.user_ids ?? [],
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    createdBy: dto.created_by,
    updatedBy: dto.updated_by ?? "",
  };
}

/**
 * Mapea la lista de Facilities
 */
export function mapFacilitiesListFromDTO(
  response: FacilitiesResponseDTO
): FacilityListPage {
  const { facilities, limit, cursor } = response.data;

  return {
    items: facilities.map(mapFacilityFromDTO),
    limit: typeof limit === "number" ? limit : 0,
    cursor: cursor ?? "",
  };
}
