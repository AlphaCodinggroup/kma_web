import type { UsersListFilter, UsersListResult } from "../list.model";

/**
 * Contrato base del repositorio de Users (listado).
 */
export interface UsersRepo {
  /**
   * Obtiene la lista de usuarios
   */
  getUsers(filters?: UsersListFilter): Promise<UsersListResult>;
}
