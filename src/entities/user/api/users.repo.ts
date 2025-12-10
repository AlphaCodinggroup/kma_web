import type { UsersListFilter, UsersListResult, CreateUserPayload, UpdateUserPayload } from "../list.model";

/**
 * Contrato base del repositorio de Users (listado).
 */
export interface UsersRepo {
  /**
   * Obtiene la lista de usuarios
   */
  getUsers(filters?: UsersListFilter): Promise<UsersListResult>;
  /**
   * Crea un nuevo usuario
   */
  createUser(payload: CreateUserPayload): Promise<void>;
  /**
   * Actualiza un usuario
   */
  updateUser(id: string, payload: UpdateUserPayload): Promise<void>;
  /**
   * Elimina un usuario
   */
  deleteUser(id: string): Promise<void>;
}
