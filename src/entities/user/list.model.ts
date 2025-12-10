export type UserId = string;

export interface UserSummary {
  id: UserId;
  name: string;
  email: string;
  role: string;
}

/** Filtros de dominio para /users */
export interface UsersListFilter {
  role?: string;
}

/** Resultado del listado*/
export interface UsersListResult {
  items: UserSummary[];
}

/** Payload para crear un usuario */
export interface CreateUserPayload {
  name: string;
  email: string;
  role: string;
  password: string;
}

/** Payload para actualizar un usuario */
export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: string;
  password?: string;
}
