import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reportsRepo } from "@features/reports/api/reports.repo.impl";

export function useDeleteReport() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => reportsRepo.delete(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["reports"] });
        },
    });
}
