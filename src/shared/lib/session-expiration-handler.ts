// -----------------------------------------------------------------------------
// Session Expiration Handler
// - Maneja la expiración de sesión de forma centralizada
// - Muestra una alerta al usuario
// - Ejecuta logout automático
// - Redirige al login
// - Previene múltiples alertas simultáneas
// -----------------------------------------------------------------------------

import { logout } from "@features/auth/lib/usecases/login";

// Estado para prevenir múltiples alertas
let isHandlingExpiration = false;

/**
 * Maneja la expiración de sesión cuando el refresh token falla.
 * - Muestra una alerta al usuario
 * - Ejecuta logout
 * - Redirige a /login
 * 
 * Esta función debe ser registrada como callback en el interceptor de auth.
 */
export async function handleSessionExpiration(): Promise<void> {
    // Prevenir múltiples ejecuciones simultáneas
    if (isHandlingExpiration) {
        return;
    }

    try {
        isHandlingExpiration = true;

        // Mostrar alerta al usuario
        if (typeof window !== "undefined") {
            window.alert(
                "Su sesión ha expirado. Por favor, inicie sesión nuevamente."
            );
        }

        // Ejecutar logout (limpia cookies server-side)
        try {
            await logout();
        } catch (err) {
            // Si el logout falla, no importa, igual limpiamos el cliente
            console.warn("[SessionExpiration] Logout failed during expiration handling:", err);
        }

        // Redirigir al login
        if (typeof window !== "undefined") {
            window.location.href = "/login";
        }
    } finally {
        // Resetear el flag después de un breve delay para evitar race conditions
        setTimeout(() => {
            isHandlingExpiration = false;
        }, 1000);
    }
}
