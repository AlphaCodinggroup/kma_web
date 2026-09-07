import type { UserSummary, UsersListResult } from "../../user/list.model";

export interface UserDTO {
  id: string;
  cognito_id?: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Mapea un usuario del DTO al dominio.
 *
 * Los campos obligatorios se normalizan a cadena: antes se copiaban tal cual,
 * así que un usuario sin rol ni nombre entraba al dominio con `undefined` y la
 * tabla mostraba celdas vacías sin ninguna señal.
 */
export function mapUserFromDTO(dto: UserDTO): UserSummary {
  return {
    id: asText(dto?.id),
    cognitoId: asText(dto?.cognito_id),
    name: asText(dto?.name),
    email: asText(dto?.email),
    role: asText(dto?.role),
  };
}

/** asText normaliza un valor de texto del DTO a cadena. */
function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Mapea la respuesta completa a dominio */
export function mapUsersListFromDTO(response: UserDTO[]): UsersListResult {
  return {
    items: Array.isArray(response) ? response.map(mapUserFromDTO) : [],
  };
}
