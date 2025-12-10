import { httpClient } from "@shared/api/http.client";
import type { UsersRepo } from "@entities/user/api/users.repo";
import type {
  UsersListFilter,
  UsersListResult,
  CreateUserPayload,
  UpdateUserPayload,
} from "@entities/user/list.model";
import {
  mapUsersListFromDTO,
  type UserDTO,
} from "@entities/user/lib/list.mappers";
import type { ApiError } from "@shared/interceptors/error";

/** Normalizador defensivo de errores a ApiError */
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
 * Implementación axios del repositorio de Users
 */
export class UsersRepoHttp implements UsersRepo {
  constructor(private readonly basePath = "/api/users") { }

  async getUsers(filters?: UsersListFilter): Promise<UsersListResult> {
    try {
      const res = await httpClient.get<UserDTO[]>(this.basePath, {
        params: {
          role: filters?.role,
        },
      });
      return mapUsersListFromDTO(res.data);
    } catch (err) {
      throw toApiError(err);
    }
  }

  async createUser(payload: CreateUserPayload): Promise<void> {
    try {
      await httpClient.post(this.basePath, payload);
    } catch (err) {
      throw toApiError(err);
    }
  }

  async updateUser(id: string, payload: UpdateUserPayload): Promise<void> {
    try {
      await httpClient.patch(`${this.basePath}/${id}`, payload);
    } catch (err) {
      throw toApiError(err);
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await httpClient.delete(`${this.basePath}/${id}`);
    } catch (err) {
      throw toApiError(err);
    }
  }
}

/** Singleton listo para inyectar */
export const usersRepoImpl = new UsersRepoHttp();
