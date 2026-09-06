import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reportsRepo } from "@features/reports/api/reports.repo.impl";

export function useDeleteReport() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => reportsRepo.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["reports"] });
        },
    });
}
