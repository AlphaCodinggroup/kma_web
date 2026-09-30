import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { deleteProject } from "@features/projects/lib/usecases/deleteProject";
import type { ProjectId } from "@entities/projects/model";
import type { ApiError } from "@shared/interceptors/error";

export interface UseDeleteProjectMutationOptions {
  onSuccess?: () => void;
  onError?: (error: ApiError) => void;
}

/**
 * Hook de mutación para eliminar un proyecto.
 *
 * - Usa el caso de uso deleteProject (dominio).
 * - Invalida todas las queries de "projects" al completar.
 * - Permite callbacks onSuccess/onError para que la UI muestre toasts, etc.
 */
export function useDeleteProjectMutation(
  options?: UseDeleteProjectMutationOptions
): UseMutationResult<void, ApiError, ProjectId> {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, ProjectId>({
    mutationKey: ["projects", "delete"],
    mutationFn: (id: ProjectId) => deleteProject(id),
    async onSuccess(_data, _variables, _context) {
      // invalidamos todas las variantes de ["projects", *]
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (options?.onSuccess) options.onSuccess();
    },
    onError(error, _variables, _context) {
      if (options?.onError) options.onError(error);
    },
  });
}
