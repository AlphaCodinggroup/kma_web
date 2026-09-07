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

export interface FacilityUploadSignature {
  uploadUrl: string;
  /**
   * Key del objeto en S3. Es lo que se guarda en la facility: el backend
   * prefirma ese valor al leerla, y una URL completa no la sabe desarmar en
   * todos los entornos.
   */
  key: string;
  expiresIn: number;
}

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
   *
   * Semántica tipo PUT:
   * - `id` es obligatorio.
   * - El resto de campos son opcionales.
   */
  update(params: UpdateFacilityParams): Promise<UpdateFacilityResult>;

  /**
   * Elimina una facility por su ID (delete "duro").
   */
  delete(facilityId: FacilityId): Promise<void>;

  /**
   * Archiva una facility por su ID..
   */
  archive(facilityId: FacilityId): Promise<Facility>;

  /**
   * Restaura una facility archivada.
   */
  restore(facilityId: FacilityId): Promise<Facility>;

  /**
   * Firma una URL de subida para la foto de la facility.
   */
  getUploadSignedUrl(
    filename: string,
    contentType: string
  ): Promise<FacilityUploadSignature>;

  /**
   * Sube un archivo (foto) a la URL presignada.
   */
  uploadFile(uploadUrl: string, file: File): Promise<void>;
}
