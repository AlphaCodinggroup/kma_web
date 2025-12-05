import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import type { Project } from "@entities/projects/model";
import type { ApiError } from "@shared/interceptors/error";
import {
  archiveProjectUseCase,
  type ArchiveProjectInput,
  type ArchiveProjectResult,
} from "@features/projects/lib/usecases/archive-project";

/**
 * Hook de React Query para archivar un proyecto.
 */
export function useArchiveProjectMutation(): UseMutationResult<
  ArchiveProjectResult,
  Readonly<ApiError>,
  ArchiveProjectInput
> {
  const queryClient = useQueryClient();

  return useMutation<
    ArchiveProjectResult,
    Readonly<ApiError>,
    ArchiveProjectInput
  >({
    mutationFn: (input) => archiveProjectUseCase(input),
    async onSuccess(_project: Project, variables) {
      // Invalidamos la lista de proyectos. Asumimos que el listado
      // usa una queryKey base ["projects", ...] (parcial).
      await queryClient.invalidateQueries({ queryKey: ["projects"] });

      // Si más adelante tenés una query de detalle tipo ["projects", "detail", id],
      // podés invalidarla acá también, por ejemplo:
      // await queryClient.invalidateQueries({
      //   queryKey: ["projects", "detail", variables.id],
      // });
    },
  });
}
