export type UserId = string;

export interface UserSummary {
  id: UserId;
  name: string;
  email: string;
}

/** Filtros de dominio para /users */
export interface UsersListFilter {
  role?: string;
}

/** Resultado del listado*/
export interface UsersListResult {
  items: UserSummary[];
}
