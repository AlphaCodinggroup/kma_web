import { httpClient } from "@shared/api/http.client";
import type { FacilitiesRepo } from "@entities/facility/api/facilities.repo";
import type {
  FacilityListFilter,
  FacilityListPage,
  FacilityId,
  Facility,
  CreateFacilityParams,
  CreateFacilityResult,
  UpdateFacilityParams,
  UpdateFacilityResult,
} from "@entities/facility/model";
import {
  mapFacilitiesListFromDTO,
  mapFacilityFromDTO,
  type FacilitiesResponseDTO,
  type FacilityDTO,
  type CreateFacilityRequestDTO,
  mapCreateFacilityParamsToDTO,
  type UpdateFacilityRequestDTO,
  mapUpdateFacilityParamsToDTO,
} from "@entities/facility/lib/mappers";
import type { ApiError } from "@shared/interceptors/error";

/** Utilidad defensiva: normaliza a ApiError en edge cases */
function toApiError(err: unknown): ApiError {
  if (err && typeof err === "object" && "code" in err && "message" in err) {
    const e = err as { code: string; message: string; details?: unknown };
    return { code: e.code, message: e.message, details: e.details };
  }

  return {
    code: "UNEXPECTED_ERROR",
    message: "Unexpected error",
    details: err,
  } as const;
}

/**
 * Implementación HTTP (axios) del repositorio de Facilities.
 */
export class FacilitiesRepoHttp implements FacilitiesRepo {
  constructor(private readonly basePath = "/api/facilities") {}

  /**
   * Listado de facilities con filtros opcionales:
   * - limit, cursor, status, search, projectId
   */
  async getFacilities(filters?: FacilityListFilter): Promise<FacilityListPage> {
    try {
      const res = await httpClient.get<FacilitiesResponseDTO>(this.basePath, {
        params: {
          limit: filters?.limit,
          status: filters?.status,
          search: filters?.search,
          cursor: filters?.cursor,
          projectId: filters?.projectId,
        },
      });

      return mapFacilitiesListFromDTO(res.data);
    } catch (err) {
      throw toApiError(err);
    }
  }

  /**
   * Obtiene el detalle de una facility por id.
   * GET /api/facilities/:id
   */
  async getById(facilityId: FacilityId): Promise<Facility> {
    try {
      const res = await httpClient.get<
        FacilityDTO | { facility: FacilityDTO } | { data: FacilityDTO }
      >(`${this.basePath}/${facilityId}`);

      const raw = res.data as
        | FacilityDTO
        | { facility: FacilityDTO }
        | { data: FacilityDTO };

      const dto: FacilityDTO =
        (raw as { facility?: FacilityDTO }).facility ??
        (raw as { data?: FacilityDTO }).data ??
        (raw as FacilityDTO);

      return mapFacilityFromDTO(dto);
    } catch (err) {
      throw toApiError(err);
    }
  }

  /**
   * Crea una nueva facility.
   * POST /api/facilities
   */
  async create(params: CreateFacilityParams): Promise<CreateFacilityResult> {
    try {
      const body: CreateFacilityRequestDTO =
        mapCreateFacilityParamsToDTO(params);

      const res = await httpClient.post<
        FacilityDTO | { facility: FacilityDTO } | { data: FacilityDTO }
      >(this.basePath, body);

      const raw = res.data as
        | FacilityDTO
        | { facility: FacilityDTO }
        | { data: FacilityDTO };

      const dto: FacilityDTO =
        (raw as { facility?: FacilityDTO }).facility ??
        (raw as { data?: FacilityDTO }).data ??
        (raw as FacilityDTO);

      return mapFacilityFromDTO(dto);
    } catch (err) {
      throw toApiError(err);
    }
  }

  /**
   * Actualiza una facility existente.
   * PUT /api/facilities/:id
   */
  async update(params: UpdateFacilityParams): Promise<UpdateFacilityResult> {
    try {
      const body: UpdateFacilityRequestDTO =
        mapUpdateFacilityParamsToDTO(params);

      const res = await httpClient.put<
        FacilityDTO | { facility: FacilityDTO } | { data: FacilityDTO }
      >(`${this.basePath}/${params.id}`, body);

      const raw = res.data as
        | FacilityDTO
        | { facility: FacilityDTO }
        | { data: FacilityDTO };

      const dto: FacilityDTO =
        (raw as { facility?: FacilityDTO }).facility ??
        (raw as { data?: FacilityDTO }).data ??
        (raw as FacilityDTO);

      return mapFacilityFromDTO(dto);
    } catch (err) {
      throw toApiError(err);
    }
  }

  /**
   * Elimina una facility.
   * DELETE /api/facilities/:id
   */
  async delete(facilityId: FacilityId): Promise<void> {
    try {
      await httpClient.delete<void>(`${this.basePath}/${facilityId}`);
    } catch (err) {
      throw toApiError(err);
    }
  }
}

/** Singleton listo para inyectar donde haga falta */
export const facilitiesRepoImpl = new FacilitiesRepoHttp();
