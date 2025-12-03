import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProject } from "@features/projects/lib/usecases/update-project";
import { projectsRepoImpl } from "@features/projects/api/projects.repo.impl";
import type {
  UpdateProjectParams,
  UpdateProjectResult,
} from "@entities/projects/model";

/**
 * Hook React Query para actualizar un proyecto.
 */
export function useUpdateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation<UpdateProjectResult, Error, UpdateProjectParams>({
    mutationFn: async (params) => await updateProject(projectsRepoImpl, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
