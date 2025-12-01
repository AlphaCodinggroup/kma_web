import { httpClient } from "@shared/api/http.client";
import type { FacilitiesRepo } from "@entities/facility/api/facilities.repo";
import type {
  FacilityListFilter,
  FacilityListPage,
  FacilityId,
  Facility,
} from "@entities/facility/model";
import {
  mapFacilitiesListFromDTO,
  mapFacilityFromDTO,
  type FacilitiesResponseDTO,
  type FacilityDTO,
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
   *
   * Internamente llama a GET /api/facilities con query params,
   * y el route handler reenvía al backend real.
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
      const res = await httpClient.get<{ data: FacilityDTO; status: string }>(
        `${this.basePath}/${facilityId}`,
      );

      return mapFacilityFromDTO(res.data.data);
    } catch (err) {
      throw toApiError(err);
    }
  }
}

/** Singleton listo para inyectar donde haga falta */
export const facilitiesRepoImpl = new FacilitiesRepoHttp();
