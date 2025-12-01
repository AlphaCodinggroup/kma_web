export type FacilityId = string;
export type ProjectId = string;
export type FacilityStatus = "ACTIVE" | "ARCHIVED";

export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Modelo de dominio de Facility.
 */
export interface Facility {
  id: FacilityId;
  projectId: ProjectId;
  name: string;
  address?: string;
  city?: string;
  geo?: GeoPoint;
  notes?: string;
  status: FacilityStatus;
  userIds: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

/** Página de resultados de Facilities (paginación por limit + cursor). */
export interface FacilityListPage {
  items: Facility[];
  limit?: number;
  cursor?: string;
}

/**
 * Filtros admitidos por el listado.
 */
export interface FacilityListFilter {
  limit?: number;
  cursor?: string;
  status?: FacilityStatus;
  search?: string;
  projectId?: ProjectId;
}
