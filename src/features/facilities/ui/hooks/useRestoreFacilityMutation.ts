import { useMutation, useQueryClient } from "@tanstack/react-query";
import { facilitiesRepoImpl } from "@features/facilities/api/facilities.repo.impl";
import type { FacilityId } from "@entities/facility/model";

export const useRestoreFacilityMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (facilityId: FacilityId) =>
            facilitiesRepoImpl.restore(facilityId),
        onSuccess: () => {
            // Invalida todas las queries de facilities para refrescar la lista
            queryClient.invalidateQueries({ queryKey: ["facilities"] });
        },
    });
};
