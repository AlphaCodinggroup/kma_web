# Plan aprobado

1. Base compartida: tokens, fuentes locales, next-themes, Radix Dialog y controles.
2. Lote independiente A: navegación, dashboard y login.
3. Lote independiente B: auditorías, revisión e informes; cursor y corrección de invalidación.
4. Lote independiente C: proyectos, instalaciones, usuarios y flujos; URL y editor móvil.
5. Integrar, ejecutar checks nativos y validar en backend local desde puerto propio del worktree.

Interfaces congeladas: clases CSS card/input/btn y variables --kma-*; Modal mantiene su API. ThemeToggle exportado desde src/shared/ui/theme-toggle.tsx. No modificación de contratos ni funciones de dominio. Cada lote posee únicamente sus pantallas/features/widgets; raíz, package, estilos y shared pertenecen al coordinador.
