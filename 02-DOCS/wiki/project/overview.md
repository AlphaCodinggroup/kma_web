# KMA Web: visión general

Escaneo del repositorio en la rama `fix/frontend-startup-warnings` (HEAD `8b27268`), con el árbol de
trabajo tal como estaba el 2026-10-23. Etiquetas: CONFIRMADO (código o configuración leídos),
INFERIDO, NO VERIFICADO. Las reglas de contrato y de seguridad viven en
[`AGENTS.md`](../../../AGENTS.md) y en el [contexto del proyecto](../../../docs/agents/project-context.md);
estas páginas las enlazan y no las repiten.

## Producto

- CONFIRMADO: consola de administración y QC de KMA (auditorías de campo, revisión QC e informes PDF
  consolidados por proyecto). Next.js App Router que actúa de BFF sobre el backend Go/Lambda; no tiene
  base de datos propia ([`AGENTS.md`](../../../AGENTS.md)).
- CONFIRMADO: el navegador solo llama a `/api/*` del mismo origen; cada handler reenvía al backend con
  [`backend-proxy.ts`](../../../src/shared/api/backend-proxy.ts). Detalle en [routes-and-bff.md](routes-and-bff.md).
- CONFIRMADO: interfaz en inglés, comentarios de código en español, `<html lang="en">`
  ([`app/layout.tsx`](../../../app/layout.tsx)).

## Consumidores y hermanos

- CONFIRMADO: el backend Go/Lambda de KMA es la fuente de verdad de cada contrato HTTP que consume esta web, y la app móvil de campo comparte los contratos de auditoría ([`AGENTS.md`](../../../AGENTS.md)).
- Este repositorio documenta solo la web: los contratos se describen aquí tal como la web los consume (rutas BFF, DTO y mappers). NO VERIFICADO: el comportamiento en vivo del backend y de la app móvil.

## Mapa de directorios

| Ruta | Contenido |
| --- | --- |
| [`app/`](../../../app) | Rutas: grupos `(auth)`, `(dashboard)`, `(standalone)`, y `api/**` (BFF); `globals.css`, `layout.tsx` |
| [`src/processes/auth`](../../../src/processes/auth) | `AuthGuard`, `getServerSession`, `AuthProvider`/`useSession` |
| [`src/widgets`](../../../src/widgets) | `shell` (AppShell, SidebarNav, AppHeader), `dashboard`, `project-detail` |
| [`src/features`](../../../src/features) | `audits`, `auth`, `catalog`, `dashboard`, `facilities`, `flows`, `projects`, `reports`, `users` (ver [features.md](features.md)) |
| [`src/entities`](../../../src/entities) | Modelos, mappers y puertos: `audit`, `catalog`, `dashboard`, `facility`, `flow`, `projects`, `report`, `user` |
| [`src/shared`](../../../src/shared) | `api`, `auth`, `config`, `interceptors`, `lib`, `providers`, `ui` |
| [`e2e/`](../../../e2e) | Specs Playwright (10 archivos) contra la plataforma local |
| [`scripts/`](../../../scripts) | Solo `rsc-compat.mjs` (adaptación RSC, sin relación con la app) |
| [`docs/`](../../../docs) | `agents/project-context.md` y `architecture/auth.md` |
| [`02-DOCS/wiki/`](../index.md) | Wiki RSC (ftd, sdd, harness, project) |
| `.worktrees/` | Worktrees de otras ramas (`new-ui`, `install-rsc-harness`); ignorados en este escaneo |

Archivos de producto y diseño en la raíz: [`PRODUCT.md`](../../../PRODUCT.md), [`DESIGN.md`](../../../DESIGN.md).

## Stack (versiones instaladas en `node_modules`; rangos en [`package.json`](../../../package.json))

| Pieza | Versión instalada | Notas |
| --- | --- | --- |
| Next.js | 15.5.9 | `typedRoutes`, Turbopack en `dev`, `output: standalone` si `DOCKER_BUILD=1` |
| React / React DOM | 19.1.0 | fijado exacto |
| TypeScript | 5.9.3 | `strict` + `exactOptionalPropertyTypes` |
| Tailwind CSS | 4.1.17 | vía `@tailwindcss/postcss` |
| TanStack React Query | 5.90.11 | única capa de estado de servidor |
| axios | 1.13.2 | `httpClient` con interceptores |
| zod | 3.25.76 | `env.ts`, formularios, validación del BFF de catálogo |
| jose | 6.2.12 | verificación JWKS |
| next-themes | 0.4.6 | tema claro/oscuro/sistema |
| lucide-react, @radix-ui/* | 0.544.0; dialog, dropdown, tabs, tooltip | |
| Vitest / Playwright / ESLint | 2.1.9 / 1.63.0 / 9.39.1 | ver [dev-test-and-deploy.md](dev-test-and-deploy.md) |

`engines.node` es `>=20`; CI y Dockerfile usan Node 22.

## Capas (FSD-like)

CONFIRMADO: alias en [`tsconfig.json`](../../../tsconfig.json) (`@app`, `@shared`, `@entities`,
`@features`, `@widgets`, `@processes`; `@components` apunta a un directorio que no existe). Cada feature
separa `api` (implementación del repo), `lib` (usecases, hooks) y `ui`. Ninguna regla de ESLint impone la
dirección de dependencias.

Violaciones conocidas (CONFIRMADO con `rg`; no arreglar de pasada):

- `shared/lib/session-expiration-handler.ts` y `widgets/shell/SidebarNav.tsx` importan `@features/auth/lib/usecases/login`.
- `entities/flow/lib/mappers.ts` importa `@features/flows/api/flows.dto`.
- `widgets/project-detail/*` importa de `features` projects, facilities, audits y reports.
- `features/audits` importa `features/reports` (hooks de informe), `features/flows` (`flowsRepo` en `AuditQuestionCard.tsx`) y `features/users` (`useAuditors`).

## Pendiente / no cubierto

- NO VERIFICADO: despliegue real (variables de Amplify, `COGNITO_ISSUER`/`COGNITO_JWKS_URL` de producción).
- NO VERIFICADO: el comportamiento en vivo del backend y de la app móvil; no se ejecutó la app, ni los tests, ni Playwright.
- No se leyó el cuerpo de cada componente: las páginas de features nombran responsabilidades por ruta, nombres de archivo y llamadas a la API.
- No se revisaron los cambios sin commitear ajenos (Catalog, rediseño, harness); solo se leyó su estado en disco cuando una ruta lo exigía.
- Sin `drift.lock` en este repo: ningún documento de esta wiki está enlazado a código con Drift.
- Los 9 `FIXME` en tests (`rg FIXME src app`) no se reevaluaron; ver [contexto](../../../docs/agents/project-context.md#known-defects).
