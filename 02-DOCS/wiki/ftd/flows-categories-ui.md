---
author: Antigravity
branch: new-ui
status: verified
---
# Gestión de categorías de Flows en KMA Web

## Intención y aceptación

Adaptar el módulo de Flows en `kma_web` para consumir los nuevos endpoints `/api/flows/categories` del backend, permitiendo en `/flows` ver, buscar, crear, editar y desactivar/eliminar categorías, y habilitar el campo editable de categoría en el editor de flow guardando el ID (UUID) de la categoría en `flow.category`.

## Alcance y checklist

- [x] Rutas BFF en `app/api/flows/categories/route.ts` (`GET`, `POST`) y `app/api/flows/categories/[id]/route.ts` (`GET`, `PUT`, `DELETE`) usando `proxyToBackend`, `pathSegment`, `forwardQuery` y `expectJson`.
- [x] Dominio, DTOs Zod, mappers tolerantes a campos ausentes y repositorio HTTP para categorías (`FlowCategory`, `Flow.category`).
- [x] Hooks de React Query (`useFlowCategoriesQuery`, `useCreateFlowCategory`, `useUpdateFlowCategory`, `useDeleteFlowCategory`) con invalidación de caché.
- [x] Interfaz amigable en `/flows` con pestañas **Flows** y **Categories**, buscador, filtro por estado, modal de alta/edición (`FlowCategoryDialog`) y acciones de edición/desactivación/eliminación (`FlowCategoriesSection`).
- [x] Campo editable **Category** en `FlowEditor` (creación y edición de flow), enviando el UUID de la categoría seleccionada.
- [x] Tests unitarios de rutas BFF, mappers, repositorio, hooks y componentes UI.
- [x] Verificación completa (`lint`, `typecheck`, `test:coverage`, `build`).

## Evidencia

- `npm run lint`: PASS (`eslint --max-warnings 0`).
- `npm run typecheck`: PASS (`tsc --noEmit`).
- `npx vitest run` (módulo de flows y categorías): 24 archivos, 329 tests PASS.
- `npm run test:coverage`: PASS (suite completa + piso de cobertura ≥ 90%).
- `npm run build`: PASS (rutas `/api/flows/categories`, `/api/flows/categories/[id]`, `/flows`, `/flows/[id]`, `/flows/new`).

## Siguiente

Validar en vivo contra el backend desplegado (y proyectar `category` en `GET /api/flows/summary` del backend si se desea ver el badge de categoría en la tarjeta de cada flow en el listado).
