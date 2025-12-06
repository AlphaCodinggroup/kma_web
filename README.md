# KMA Web — Dashboard de auditorías

Aplicación Next.js (App Router) para gestionar auditorías, reportes y catálogo de flujos. Incluye autenticación con cookies httpOnly, UI basada en Tailwind + shadcn/ui y consumo de APIs reales mediante axios con interceptores.

## Requisitos
- Node.js >= 20 (ver `"engines"` en package.json).
- Gestor de paquetes: `pnpm` (lockfile en repo).
- Archivo `.env.local` con las variables validadas vía Zod.

### Variables de entorno
Public (prefijo NEXT_PUBLIC):
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_ENV` (`development|staging|production`)
- `NEXT_PUBLIC_AUTH_BASE_URL` (endpoint de Cognito)
- `NEXT_PUBLIC_HTTP_TIMEOUT_MS`
- `NEXT_PUBLIC_QUERY_STALE_TIME`
- `NEXT_PUBLIC_API_BASE_URL` (backend público)

Servidor:
- `COGNITO_REGION`
- `COGNITO_CLIENT_ID`
- `COGNITO_USER_POOL_ID` (opcional)
- `COGNITO_JWKS_URL` (opcional)
- `SESSION_COOKIE_NAME`
- `ACCESS_TOKEN_COOKIE_NAME`
- `REFRESH_TOKEN_COOKIE_NAME`
- `COOKIE_SECURE`
- `COOKIE_SAMESITE` (`Lax|Strict|None`)
- `COOKIE_DOMAIN` (opcional)
- `HTTP_RETRY_MAX_ATTEMPTS`
- `HTTP_RETRY_BASE_DELAY_MS`

Ejemplo de `.env.local`:
```bash
NEXT_PUBLIC_APP_NAME=KMA
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_AUTH_BASE_URL=https://cognito-idp.eu-west-1.amazonaws.com/
NEXT_PUBLIC_HTTP_TIMEOUT_MS=15000
NEXT_PUBLIC_QUERY_STALE_TIME=300000
NEXT_PUBLIC_API_BASE_URL=https://api.example.com

COGNITO_REGION=eu-west-1
COGNITO_CLIENT_ID=xxxx
COGNITO_USER_POOL_ID=xxxx
COGNITO_JWKS_URL=https://cognito-idp.eu-west-1.amazonaws.com/xxxx/.well-known/jwks.json
SESSION_COOKIE_NAME=kma_session
ACCESS_TOKEN_COOKIE_NAME=kma_access
REFRESH_TOKEN_COOKIE_NAME=kma_refresh
COOKIE_SECURE=false
COOKIE_SAMESITE=Lax
COOKIE_DOMAIN=
HTTP_RETRY_MAX_ATTEMPTS=3
HTTP_RETRY_BASE_DELAY_MS=500
```

## Comandos básicos
- `pnpm install` — instala dependencias.
- `pnpm dev` — modo desarrollo (Next + Turbopack).
- `pnpm build` — build de producción.
- `pnpm start` — arranca el build generado.
- `pnpm lint` — linting con ESLint.
- `pnpm typecheck` — chequeo estricto de TypeScript.

## Arquitectura y patrones
- **Next.js 15 + App Router** con server components donde aplica y layout privado que usa `AuthGuard`.
- **TypeScript estricto** (`strict` y `exactOptionalPropertyTypes` activados).
- **UI**: Tailwind 4, shadcn/ui, iconos lucide-react y tipografía Geist; estilos base en `app/globals.css`.
- **Estado de servidor**: TanStack Query con provider propio (`src/shared/providers/query-provider.tsx`).
- **HTTP**: axios cliente (`src/shared/api/http.client.ts`) con interceptores de error y auth (cola de refresh en 401); cliente server (`src/shared/api/http.server.ts`) con backoff y lectura de cookies httpOnly.
- **Dominio / FSD + Clean**:
  - `src/entities/*`: modelos y contratos de repos.
  - `src/features/*`: casos de uso, hooks y UI desacoplada.
  - `src/widgets/*`: composición de páginas (shell, dashboard, etc.).
  - `src/processes/*`: procesos transversales (auth guard, bootstrap).
  - `app/*`: rutas y layout; `app/api/*` como handlers/proxies hacia backend y Cognito.
- **Formularios/validación**: react-hook-form + zod.

## Estructura de carpetas (resumen)
```
app/
  layout.tsx
  page.tsx                  # redirect → /login
  globals.css
  (auth)/login/page.tsx
  (dashboard)/layout.tsx    # shell privada + sidebar + QueryProvider
  (dashboard)/{dashboard,audits,projects,facilities,flows,flows/[id],reports,users}/page.tsx
  (standalone)/audits/[id]/edit/page.tsx
  api/{session,audits,projects,facilities,flows,reports,users,dashboard}/route.ts
src/
  shared/{api,config,interceptors,providers,ui,lib}
  entities/{audit,user,projects,facility,flow,report}/...
  features/{auth,audits,projects,facilities,flows,reports,users}/...
  widgets/{shell,dashboard}/...
  processes/auth/guard.tsx
public/
```

## Pantallas principales
- `/login`: formulario usuario/contraseña; si ya hay sesión (cookie httpOnly) redirige a `/dashboard`.
- `/dashboard`: métricas de proyectos/reportes y actividad reciente, con botón de refresh.
- `/audits`: tabla con filtros locales y acciones de editar; envía a workspace de auditoría.
- `/audits/[id]/edit`: workspace con cabecera y panel de info, tabs de **Questions & Attachments** (preguntas respondidas y notas, filtro de “no”) y **Report** (findings con severidad, exportación a PDF con polling).
- `/reports`: listado paginado de reportes generados, búsqueda y descarga del PDF real.
- `/flows`: catálogo de flujos de auditoría con búsqueda; detalle/edición en `/flows/[id]`.
- `/projects`: gestión CRUD con diálogos para crear/editar, eliminar y archivar; filtros por texto.
- `/facilities`: gestión de sedes con creación/edición, eliminación y archivado; búsqueda local.
- `/users`: listado con métricas por rol y búsqueda; acciones de usuario en preparación.
