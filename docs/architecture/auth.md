# Autenticación y sesión (AWS Cognito + Next.js App Router)

Login, sesión y verificación de rol contra AWS Cognito, con cookies httpOnly y sin base de datos
propia. Este documento describe el código actual; ante una duda, el código manda.

## Archivos clave

```
app/
  (auth)/login/page.tsx            # Página pública; redirige a /dashboard si hay cookie de acceso
  (dashboard)/layout.tsx           # Zona privada: AuthGuard + AuthProvider
  api/session/route.ts             # POST login | DELETE logout (setea/borra cookies)
  api/session/refresh/route.ts     # POST refresh
src/
  features/auth/
    api/cognito.repo.impl.ts       # Llamadas HTTP directas a Cognito (InitiateAuth, GlobalSignOut)
    ui/LoginForm.tsx                # react-hook-form + zod
  processes/auth/
    guard.tsx                       # AuthGuard (Server Component): sólo verifica que exista la cookie
    session.ts                      # getServerSession(): arma el Session verificando el JWT
    context.tsx                     # React context con isAdmin
  shared/
    auth/verify-access-token.ts     # Verifica firma, issuer y expiración contra el JWKS
    auth/cognito-groups.ts          # Parsea cognito:groups (array o string "[admin qc]")
    api/http.client.ts              # Instala los interceptores de auth y de error, en ese orden
    interceptors/auth.ts            # 401 en /api/* → cola de refresh → un reintento
```

## Cookies

Nombres configurables por `SESSION_COOKIE_NAME`, `ACCESS_TOKEN_COOKIE_NAME` y
`REFRESH_TOKEN_COOKIE_NAME` (`src/shared/config/env.ts`). En local (compose del backend) son
`kma_session`, `kma_access_token` y `kma_refresh_token`.

| Cookie | httpOnly | Contenido | TTL |
| --- | --- | --- | --- |
| access | Sí | JWT de Cognito | el que devuelve Cognito |
| refresh | Sí | refresh token | 30 días si Cognito no informa uno propio |
| flag de sesión | No | `"1"`, sin datos sensibles | igual al access; el código nunca la lee de vuelta |

En local, `COOKIE_SECURE=false` y sin `COOKIE_DOMAIN`, o el navegador no persiste las cookies
(`app/api/session/route.ts` fuerza esto cuando `NEXT_PUBLIC_APP_ENV=development`).

## Login, refresh y logout

- **Login:** `LoginForm` → `POST /api/session` → `initiateAuthWithPassword` (Cognito
  `USER_PASSWORD_AUTH`) → se setean las tres cookies en la respuesta.
- **Refresh:** ante un 401 de `/api/*` (excepto `/api/session` y `/api/session/refresh`), el
  interceptor de auth hace una sola llamada a `POST /api/session/refresh` aunque haya varias
  peticiones fallidas a la vez, y reintenta cada una una sola vez. Una segunda falla dispara logout.
- **Logout:** `DELETE /api/session` llama a `GlobalSignOut` con el access token (best-effort) y
  siempre borra las tres cookies, incluso si esa llamada falla.

## Verificación del rol

`AuthGuard` (`guard.tsx`) sólo comprueba que exista la cookie de acceso; no valida el JWT, así que
una cookie vencida igual muestra el layout privado hasta que la primera llamada a `/api/*` da 401.

`getServerSession()` sí verifica: usa `verifyAccessToken`, que valida la firma contra el JWKS
(`COGNITO_JWKS_URL`) y el issuer cuando `COGNITO_ISSUER` está seteado. Sin JWKS configurado, en
producción falla cerrado; fuera de producción decodifica sin verificar y lo marca `verified: false`.

El rol sale de `cognito:groups`, con precedencia `administrator > admin > auditor > viewer`; un
grupo desconocido (por ejemplo `qc`) pasa igual como texto y queda fuera del tipo `Role`. `isAdmin`
es la única bandera de capacidad que usa la UI. El BFF no aplica ningún control de rol: la
autorización real depende del backend o del authorizer de API Gateway.

## Qué no hay

Sin rate limiting en `/api/session*`, sin CSRF explícito (se apoya en `SameSite` y en que las
cookies son httpOnly), y sin `middleware.ts`: toda la protección de rutas pasa por `AuthGuard` en
cada layout privado.
