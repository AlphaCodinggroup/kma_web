import type {
  Facility,
  FacilityId,
  FacilityListFilter,
  FacilityListPage,
  ProjectId,
} from "../model";

export interface FacilitiesRepo {
  /**
   * Lista de facilities con filtros opcionales.
   */
  getFacilities(
    filters?: FacilityListFilter & { projectId?: ProjectId }
  ): Promise<FacilityListPage>;

  /**
   * Detalle de una facility por su ID.
   */
  getById?(facilityId: FacilityId): Promise<Facility>;
}
