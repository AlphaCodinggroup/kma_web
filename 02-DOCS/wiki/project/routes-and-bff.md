# Rutas y BFF

Todo lo siguiente es CONFIRMADO leyendo `app/` y [`backend-proxy.ts`](../../../src/shared/api/backend-proxy.ts)
salvo donde se marque. Invariantes del proxy (401 sin cookie, `forwardQuery`, `numericQuery`, `pathSegment`):
[`AGENTS.md`](../../../AGENTS.md#contracts-and-business-invariants).

## Páginas

| Ruta | Archivo | Acceso en servidor | Acceso en UI |
| --- | --- | --- | --- |
| `/` | [`app/page.tsx`](../../../app/page.tsx) | redirige a `/login` | |
| `/login` | [`(auth)/login/page.tsx`](../../../app/(auth)/login/page.tsx) | pública; con cookie de acceso redirige a `/dashboard` | |
| `/dashboard` | [`(dashboard)/dashboard`](../../../app/(dashboard)/dashboard/page.tsx) | `AuthGuard` (solo existencia de cookie) | todos |
| `/projects` (`?tab=projects\|facilities`) | [`projects/page.tsx`](../../../app/(dashboard)/projects/page.tsx) | `AuthGuard` | edición solo `isAdmin` |
| `/projects/[id]` | [`projects/[id]`](../../../app/(dashboard)/projects/[id]/page.tsx) | `AuthGuard` | |
| `/audits` | [`audits/page.tsx`](../../../app/(dashboard)/audits/page.tsx) | `AuthGuard` | editar/borrar solo `isAdmin` |
| `/audits/[id]/edit` | [`(standalone)/audits/[id]/edit`](../../../app/(standalone)/audits/[id]/edit/page.tsx) | `AuthGuard` en su `layout.tsx`, sin shell | edición QC: `isAdmin` y estado `draft_report_in_review` |
| `/reports` | [`reports/page.tsx`](../../../app/(dashboard)/reports/page.tsx) | `AuthGuard` | borrar solo `isAdmin` |
| `/flows`, `/flows/new`, `/flows/[id]` | [`flows`](../../../app/(dashboard)/flows) | `AuthGuard` | crear/editar/borrar solo `isAdmin` |
| `/users` | [`users/page.tsx`](../../../app/(dashboard)/users/page.tsx) | `AuthGuard`; sin comprobación de rol | enlace oculto a no admin; editar/borrar `isAdmin` |
| `/catalog` | [`catalog/page.tsx`](../../../app/(dashboard)/catalog/page.tsx) | verifica el rol en servidor: `admin` o `administrator`, si no muestra un aviso | enlace oculto a no admin |

Layouts: [`(dashboard)/layout.tsx`](../../../app/(dashboard)/layout.tsx) (`force-dynamic`, `AuthGuard` +
`AuthProvider` + `QueryProvider` + `AppShell`), [`error.tsx`](../../../app/(dashboard)/error.tsx),
[`global-error.tsx`](../../../app/global-error.tsx). No existe `middleware.ts`.

Sidebar ([`SidebarNav.tsx`](../../../src/widgets/shell/SidebarNav.tsx)): grupo Workspace (Dashboard,
Projects, Facilities, Audits, Reports) y Administration (Catalog, Flows, User Management). Solo `/users` y
`/catalog` se ocultan a quien no es `admin`/`administrator`; el ocultamiento es de UI, no autorización.

## Rutas BFF (`app/api/**`) hacia el backend

Todas devuelven 401 sin cookie de acceso (excepto `/api/session*`). Ninguna aplica rol, salvo `catalog`.
`{base}` es `NEXT_PUBLIC_API_BASE_URL`.

| Ruta BFF | Métodos | Endpoint backend | Reglas del handler |
| --- | --- | --- | --- |
| `/api/session` | POST, DELETE | Cognito `InitiateAuth` / `GlobalSignOut` (no pasa por `{base}`) | ver [auth-and-session.md](auth-and-session.md) |
| `/api/session/refresh` | POST | Cognito refresh | idem |
| `/api/audits` | GET | `/audits` | `forwardQuery`: status, auditor, project_id, limit, last_eval_id; `limit` <= 200 |
| `/api/audits/[auditId]` | GET, DELETE | `/audits/{id}` | |
| `/api/audits/[auditId]/send-for-review` | POST | `/audits/{id}/send-for-review` | sin cuerpo |
| `/api/audits/audit-reviews/[auditReviewId]` | GET | `/audits-review/{id}` | |
| `/api/audits-review/[auditId]/answers` | PUT | `/audits-review/{id}/answers` | JSON validado |
| `/api/audits-review/[auditId]/status` | PATCH | `/audits-review/{id}/status` | JSON validado |
| `/api/audits-review/[auditId]/complete-review` | POST | `/audits-review/{id}/complete-review` | sin cuerpo |
| `/api/audits-review/[auditId]/findings/[questionCode]` | PATCH | `/audits-review/{id}/findings/{code}` | `forwardQuery: mitigation_id`; JSON validado |
| `/api/reports` | GET | `/reports` | `forwardQuery`: project_id, user_id, status, limit, last_eval_id |
| `/api/reports/[auditId]` | GET, DELETE | `/reports/{id}` | el segmento se llama `auditId` pero el informe es por proyecto |
| `/api/projects` | GET, POST | `/projects` | GET: `forwardQuery` limit, cursor, status, search |
| `/api/projects/[id]` | GET, PATCH, DELETE | `/projects/{id}` | |
| `/api/projects/[id]/archive`, `/restore` | POST | `/projects/{id}/archive`, `/restore` | sin cuerpo |
| `/api/projects/[id]/facilities` | GET | `/projects/{id}/facilities` | |
| `/api/facilities` | GET, POST | `/facilities` | GET: limit, cursor, status, search |
| `/api/facilities/[id]` | GET, PUT, DELETE | `/facilities/{id}` | |
| `/api/facilities/[id]/archive`, `/restore` | POST | `/facilities/{id}/archive`, `/restore` | sin cuerpo |
| `/api/facilities/upload-img` | POST | `/facilities/upload-img` | exige `filename` y `content_type` |
| `/api/flows`, `/api/flows/[id]`, `/api/flows/summary` | GET, POST / GET, PUT, DELETE / GET | `/flows`, `/flows/{id}`, `/flows/summary` | |
| `/api/users` | GET, POST | `/users` | GET: `forwardQuery` role |
| `/api/users/[id]` | PATCH, DELETE | `PUT /users/{id}` (el PATCH del BFF se reenvía como PUT), `DELETE /users/{id}` | |
| `/api/comments` | GET, POST | `/comments` | GET exige `audit_id` |
| `/api/comments/[commentId]` | PUT | `/comments/{id}` | |
| `/api/dashboard` | GET | `/dashboard` | |
| `/api/uploads` | POST | `/uploads` | JSON validado |
| `/api/uploads/presigned` | POST | `/uploads/presigned` | JSON validado |
| `/api/uploads/proxy` | PUT | URL externa (`?url=`) | allowlist de hosts `UPLOAD_PROXY_ALLOWED_HOSTS`, solo http(s), sin credenciales, `redirect: "manual"` |
| `/api/catalog/[...path]` | GET, POST, PUT, DELETE | `/admin/catalog/{resource}` | ver abajo |

Archivo extra sin handler: [`app/api/flows/accessible_route.json`](../../../app/api/flows/accessible_route.json)
(JSON suelto; `rg` no encuentra ninguna referencia en el repo).

### Catálogo (handler propio)

[`catalog/[...path]/route.ts`](../../../app/api/catalog/[...path]/route.ts) llama a `getServerSession()` y
exige rol `admin`/`administrator` (403 si no). Recursos de lectura: `status`, `versions`, `items`,
`operations`, `operations/{uuid}`, `export` (binario XLSX, tope 3 MiB). Escrituras: `validate`, `imports`,
`upload`, `activate`, y `items` (POST crear; PUT/DELETE `items/{flow_id}/{catalog_item_id}`). En escritura
exige `Origin` igual al host público (403 si difiere), `Content-Type: application/json` (415), cuerpo
<= ~4 MiB leído por streaming y validado con zod `strict` (400); el cuerpo lleva `operation_id` (uuid) y
`expected_revision`/`base_version`. `export` y los listados (`limit` <= 200 en `items`, 100 en
`versions`/`operations`) reenvían solo query permitida. El soporte binario de `proxyToBackend`
(`binary`) y su test `backend-proxy-binary.test.ts` están sin commitear al escanear.

## Configuración (`env.ts`)

[`src/shared/config/env.ts`](../../../src/shared/config/env.ts) es la única fuente: `publicEnv()`
(`NEXT_PUBLIC_*`, validado de forma perezosa; alias deprecado `PublicEnv`) y `serverEnv()` (lanza si se
llama en el navegador).

| Grupo | Variables |
| --- | --- |
| Públicas obligatorias | `NEXT_PUBLIC_APP_NAME`, `_APP_ENV` (development/staging/production), `_AUTH_BASE_URL`, `_API_BASE_URL`, `_HTTP_TIMEOUT_MS`, `_QUERY_STALE_TIME` |
| Públicas opcionales | `NEXT_PUBLIC_REPORT_POLL_INTERVAL_MS` (2000), `_POLL_MAX_ATTEMPTS` (60), `_ESTIMATE_MS` (30000), `_TIMEOUT_MS` (180000), `_DOWNLOAD_MODE` (stream), `_STREAM_MAX_MB` (200), `NEXT_PUBLIC_LOCALE` (en-US) |
| Servidor obligatorias | `COGNITO_REGION`, `COGNITO_CLIENT_ID`, `SESSION_COOKIE_NAME`, `ACCESS_TOKEN_COOKIE_NAME`, `REFRESH_TOKEN_COOKIE_NAME`, `COOKIE_SECURE`, `COOKIE_SAMESITE`, `HTTP_RETRY_MAX_ATTEMPTS`, `HTTP_RETRY_BASE_DELAY_MS` |
| Servidor opcionales | `COGNITO_USER_POOL_ID`, `COGNITO_JWKS_URL`, `COGNITO_ISSUER`, `COOKIE_DOMAIN`, `UPLOAD_PROXY_ALLOWED_HOSTS` (por defecto un host S3 fijo, ver [contexto](../../../docs/agents/project-context.md#config-and-env)) |

`process.env` se lee además en `app/api/session/route.ts` (`NEXT_PUBLIC_APP_ENV`, `VERCEL_ENV`) y en
`next.config.ts` (`DOCKER_BUILD`): excepciones a "solo `env.ts`".

## Cabeceras y contratos conocidos

[`next.config.ts`](../../../next.config.ts) aplica `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`,
HSTS y `Permissions-Policy` a todas las rutas; no hay `Content-Security-Policy` (CONFIRMADO). Desajustes de
contrato (send-for-review, `completed_at`, estados de auditoría): ver
[contexto](../../../docs/agents/project-context.md#domain-and-contracts).
