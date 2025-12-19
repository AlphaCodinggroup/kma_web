import { useUsersQuery } from "@features/users/ui/hooks/useUsersQuery";

export interface AuditorOption {
    id: string;
    name: string;
}

/**
 * Hook para obtener la lista de auditores.
 * Utiliza useUsersQuery con filtro role=auditor.
 */
export function useAuditors() {
    const { data, isLoading, isError } = useUsersQuery({ role: "auditor" });

    const auditors: AuditorOption[] =
        data?.items
            .filter((user) => Boolean(user.name))
            .map((user) => ({
                id: user.id,
                name: user.name,
            }))
            .sort((a, b) => a.name.localeCompare(b.name)) ?? [];

    return {
        auditors,
        isLoading,
        isError,
    };
}

export default useAuditors;
