"use client";

import { useSession as useSessionContext } from "./context";

/**
 * Hook para acceder a la sesión actual y verificar permisos.
 * Requiere que el componente esté envuelto en AuthProvider.
 */
export function useSession() {
    return useSessionContext();
}
