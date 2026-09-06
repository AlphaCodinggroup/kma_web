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
import { toApiError, type ApiError } from "@shared/interceptors/error";


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
