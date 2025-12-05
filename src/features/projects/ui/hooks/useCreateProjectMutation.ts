import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProject } from "@features/projects/lib/usecases/create-project";
import { projectsRepoImpl } from "@features/projects/api/projects.repo.impl";
import type {
  CreateProjectParams,
  CreateProjectResult,
} from "@entities/projects/model";

/**
 * Hook React Query para crear un nuevo proyecto.
 * - Envuelve el caso de uso createProject().
 * - Invalida el cache de ["projects"] al éxito.
 * - Maneja errores de forma controlada.
 */
export function useCreateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation<CreateProjectResult, Error, CreateProjectParams>({
    mutationFn: async (params) => await createProject(projectsRepoImpl, params),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}
