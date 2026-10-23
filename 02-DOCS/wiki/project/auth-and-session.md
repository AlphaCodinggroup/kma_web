# Autenticación y sesión

La descripción canónica está en [`docs/architecture/auth.md`](../../../docs/architecture/auth.md) y en
[contexto: auth y sesión](../../../docs/agents/project-context.md#auth-and-session). Esta página resume lo
verificado en código y añade lo que esos documentos no cubren.

## Flujo

| Paso | Código (CONFIRMADO) |
| --- | --- |
| Login | [`LoginForm`](../../../src/features/auth/ui/LoginForm.tsx) -> `POST /api/session` ([`route.ts`](../../../app/api/session/route.ts)) -> `initiateAuthWithPassword` (Cognito `USER_PASSWORD_AUTH`, llamada HTTP directa en [`cognito.repo.impl.ts`](../../../src/features/auth/api/cognito.repo.impl.ts)) |
| Cookies | httpOnly de acceso y de refresco (30 días si Cognito no informa TTL) y una cookie flag no httpOnly con valor `"1"`; nombres por `SESSION_COOKIE_NAME`, `ACCESS_TOKEN_COOKIE_NAME`, `REFRESH_TOKEN_COOKIE_NAME`; `Secure`, `SameSite`, `Domain` desde `env.ts`; con `NEXT_PUBLIC_APP_ENV=development` se fuerza `secure=false` y sin dominio |
| Refresh | `POST /api/session/refresh` (`REFRESH_TOKEN_AUTH`); sin cookie de refresco responde 401 y limpia; errores de autorización limpian cookies |
| Cliente | [`interceptors/auth.ts`](../../../src/shared/interceptors/auth.ts): un 401 de `/api/*` (salvo `/api/session` y `/refresh`) dispara un solo refresh compartido, cola de peticiones y un reintento; segundo fallo, logout. Se instala antes del interceptor de errores en [`http.client.ts`](../../../src/shared/api/http.client.ts) |
| Logout | `DELETE /api/session`: `GlobalSignOut` best-effort y borrado de cookies siempre |
| Guardia | [`AuthGuard`](../../../src/processes/auth/guard.tsx) (Server Component) solo comprueba que exista la cookie de acceso; no verifica el JWT |
| Sesión de UI | [`getServerSession`](../../../src/processes/auth/session.ts) llama a `verifyAccessToken` y mapea los claims a `Session`; `AuthProvider` expone `isAdmin` (`admin` o `administrator`) |

## Verificación del token

[`verify-access-token.ts`](../../../src/shared/auth/verify-access-token.ts): `jwtVerify` de `jose` contra
`COGNITO_JWKS_URL` (JWKS remoto cacheado por URL) con `issuer` si `COGNITO_ISSUER` está definido; motivos de
fallo: `missing-token`, `invalid-signature`, `expired`, `invalid-issuer`, `not-configured`. Sin JWKS: en
producción (`NEXT_PUBLIC_APP_ENV=production`) falla cerrado; fuera de producción decodifica sin verificar
(`verified: false`). No valida `token_use`, `client_id` ni `aud` (CONFIRMADO: solo issuer y firma/expiración).
Su único consumidor es `getServerSession` y, a través de él, la página y el handler de `/catalog`.

## Roles

- Fuente: claim `cognito:groups`, parseado por [`cognito-groups.ts`](../../../src/shared/auth/cognito-groups.ts)
  (acepta array o cadena `"[admin qc]"`).
- `Role` = `administrator | admin | auditor | viewer` ([`sessions.ts`](../../../src/entities/user/model/sessions.ts));
  precedencia `administrator > admin > auditor > viewer` en
  [`mappers.ts`](../../../src/entities/user/lib/mappers.ts). Un grupo desconocido (p. ej. `qc`) pasa como texto
  fuera del tipo (contexto del proyecto).
- Dónde se aplica de verdad en este repo: solo `/catalog` (página y `/api/catalog/*`, 403). En el resto, el
  rol solo oculta enlaces (`/users`, `/catalog`) y deshabilita controles; el BFF reenvía el bearer y la
  autorización recae en el backend/API Gateway (NO VERIFICADO desde este repo).

## CSRF y Origin

- CONFIRMADO: no hay protección CSRF genérica; las escrituras del BFF se apoyan en cookies `SameSite`
  (`Lax` en local y en el build de CI) y en que las cookies son httpOnly. Sin `middleware.ts`.
- CONFIRMADO: la única comprobación de `Origin` está en `/api/catalog/*` (escrituras): el origen debe
  coincidir con `protocolo://host` (`Host` respeta el origen público tras un proxy) o 403; además exige
  `application/json`.
- CONFIRMADO: sin rate limiting en `/api/session*`.
- `/api/uploads/proxy`: allowlist de hosts, sin credenciales embebidas, `redirect: "manual"`; sin límite de
  tamaño ni bloqueo de IP privada ([contexto](../../../docs/agents/project-context.md#bff-and-upload-proxy)).

## No verificado

- Configuración real de producción: pool y app client de Cognito, `COOKIE_SAMESITE`/`COOKIE_DOMAIN`
  desplegados y variables de Amplify.
- Que el backend o el authorizer apliquen rol en cada ruta que el BFF reenvía sin comprobar.
- El comportamiento del mock de Cognito local (lo provee la plataforma local del backend; credenciales de demo en
  [`AGENTS.md`](../../../AGENTS.md)).
- Tests: existen unitarios de `verify-access-token`, cognito-groups, interceptor, guard y rutas
  `session` (en `__tests__`); no se ejecutaron en este escaneo.
