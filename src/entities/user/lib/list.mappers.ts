import type { UserSummary, UsersListResult } from "../../user/list.model";

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: string;
}

/** Mapea un usuario del DTO al dominio */
export function mapUserFromDTO(dto: UserDTO): UserSummary {
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    role: dto.role,
  };
}

/** Mapea la respuesta completa a dominio */
export function mapUsersListFromDTO(response: UserDTO[]): UsersListResult {
  return {
    items: Array.isArray(response) ? response.map(mapUserFromDTO) : [],
  };
}
