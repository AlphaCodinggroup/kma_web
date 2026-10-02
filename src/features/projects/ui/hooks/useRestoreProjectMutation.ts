import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import type { ApiError } from "@shared/interceptors/error";
import {
  restoreProjectUseCase,
  type RestoreProjectInput,
  type RestoreProjectResult,
} from "@features/projects/lib/usecases/restore-project";

/**
 * Hook de React Query para restaurar un proyecto archivado.
 */
export function useRestoreProjectMutation(): UseMutationResult<
  RestoreProjectResult,
  Readonly<ApiError>,
  RestoreProjectInput
> {
  const queryClient = useQueryClient();

  return useMutation<
    RestoreProjectResult,
    Readonly<ApiError>,
    RestoreProjectInput
  >({
    mutationFn: (input) => restoreProjectUseCase(input),
    async onSuccess() {
      // Un proyecto restaurado pasa de la lista de archivados a la de activos:
      // las dos listas (y el detalle) cuelgan de la clave base ["projects"].
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
