import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type {
  UsersListResult,
  UsersListFilter,
} from "@entities/user/list.model";
import { usersRepoImpl } from "@features/users/api/users.repo.impl";

/**
 * Genera una clave estable para React Query.
 */
function createUsersQueryKey(filters?: UsersListFilter) {
  return ["users", filters] as const;
}

/**
 * Hook React Query para listar usuarios.
 */
export function useUsersQuery(
  filters?: UsersListFilter
): UseQueryResult<UsersListResult> {
  return useQuery({
    queryKey: createUsersQueryKey(filters),
    queryFn: () => usersRepoImpl.getUsers(filters),
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
}
