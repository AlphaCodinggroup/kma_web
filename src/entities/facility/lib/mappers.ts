import type {
  Facility,
  FacilityListPage,
  CreateFacilityParams,
} from "../model";

/**
 * DTO compatible con la API de Facilities.
 */
export interface FacilityDTO {
  facility_id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  description?: string | null;
  photo_url?: string | null;
  geo?: { lat: number; lng: number } | null;

  status: "ACTIVE" | "ARCHIVED";

  created_at: string;
  updated_at: string;
  created_by: string;
  project_id?: string | null;
  user_ids?: string[];
  updated_by?: string | null;
}

/**
 * Shape real de la respuesta de listado:
 */
export interface FacilitiesResponseDTO {
  facilities: FacilityDTO[];
  total?: number;
  limit?: number | null;
  cursor?: string | null;
}

/**
 * Body para crear una Facility en la API.
 */
export interface CreateFacilityRequestDTO {
  name: string;
  project_id?: string;
  address?: string;
  city?: string;
  description?: string;
  photo_url?: string;
  status?: "ACTIVE" | "ARCHIVED";
  geo?: {
    lat: number;
    lng: number;
  };
}

/**
 * Mapea CreateFacilityParams (dominio) → CreateFacilityRequestDTO (HTTP).
 */
export function mapCreateFacilityParamsToDTO(
  params: CreateFacilityParams,
): CreateFacilityRequestDTO {
  const dto: CreateFacilityRequestDTO = {
    name: params.name,
    status: params.status ?? "ACTIVE",
  };

  if (params.projectId) {
    dto.project_id = params.projectId;
  }

  if (params.address) {
    dto.address = params.address;
  }

  if (params.city) {
    dto.city = params.city;
  }

  if (params.notes) {
    dto.description = params.notes;
  }

  if (params.geo) {
    dto.geo = {
      lat: params.geo.lat,
      lng: params.geo.lng,
    };
  }

  // Si más adelante el dominio tiene photoUrl, se mapea acá:
  // if (params.photoUrl) dto.photo_url = params.photoUrl;

  return dto;
}

/**
 * Mapea un FacilityDTO al dominio Facility.
 */
export function mapFacilityFromDTO(dto: FacilityDTO): Facility {
  const facility: Facility = {
    id: dto.facility_id,
    projectId: dto.project_id ?? "",
    name: dto.name,
    status: dto.status,
    userIds: dto.user_ids ?? [],
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    createdBy: dto.created_by,
  };

  if (dto.address != null) {
    facility.address = dto.address;
  }

  if (dto.city != null) {
    facility.city = dto.city;
  }

  if (dto.description != null) {
    facility.notes = dto.description;
  }

  if (dto.geo) {
    facility.geo = {
      lat: dto.geo.lat,
      lng: dto.geo.lng,
    };
  }

  if (dto.updated_by != null) {
    facility.updatedBy = dto.updated_by;
  }

  return facility;
}

/**
 * Mapea la respuesta de Facilities al modelo de dominio paginado.
 */
export function mapFacilitiesListFromDTO(
  response: FacilitiesResponseDTO,
): FacilityListPage {
  const page: FacilityListPage = {
    items: response.facilities.map(mapFacilityFromDTO),
  };

  if (typeof response.limit === "number") {
    page.limit = response.limit;
  }

  if (response.cursor != null) {
    page.cursor = response.cursor;
  }

  return page;
}
