import { useMutation, useQueryClient } from "@tanstack/react-query";
import deleteAudit from "../usecases/deleteAudit";

/**
 * Hook para eliminar una auditoría.
 * Automáticamente invalida y refetch la lista de auditorías después de eliminar.
 */
export function useDeleteAudit() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (auditId: string) => deleteAudit(auditId),
        onSuccess: () => {
            // Invalidar todas las queries de audits para refetch
            queryClient.invalidateQueries({ queryKey: ["audits", "list"] });
        },
    });
}

export default useDeleteAudit;
