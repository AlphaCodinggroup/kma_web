import type {
  Facility,
  FacilityId,
  FacilityListFilter,
  FacilityListPage,
  CreateFacilityParams,
  CreateFacilityResult,
  UpdateFacilityParams,
  UpdateFacilityResult,
} from "../model";

/**
 * Puerto de dominio para Facilities.
 *
 * NO conoce HTTP ni axios, solo modelos de dominio.
 */
export interface FacilitiesRepo {
  /**
   * Lista de facilities con filtros opcionales.
   */
  getFacilities(filters?: FacilityListFilter): Promise<FacilityListPage>;

  /**
   * Detalle de una facility por su ID.
   */
  getById(facilityId: FacilityId): Promise<Facility>;

  /**
   * Crea una nueva facility.
   */
  create(params: CreateFacilityParams): Promise<CreateFacilityResult>;

  /**
   * Actualiza una facility existente.
   */
  update(params: UpdateFacilityParams): Promise<UpdateFacilityResult>;

  /**
   * Elimina una facility por su ID.
   */
  delete(facilityId: FacilityId): Promise<void>;
}
