import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reportsRepo } from "@features/reports/api/reports.repo.impl";

export function useRestoreReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reportsRepo.restore(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
  });
}
