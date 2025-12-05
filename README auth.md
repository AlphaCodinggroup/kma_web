# Autenticación y Sesión (AWS Cognito + Next.js App Router)

> **Objetivo**  
> Implementar un flujo de **login seguro** con **AWS Cognito** usando **Next.js (App Router)**, **cookies httpOnly**, **Route Handlers**, e **interceptores Axios** (incluyendo **refresh queue**), respetando la arquitectura FSD/Clean propuesta.

---

## Índice

1. [Arquitectura y archivos clave](#arquitectura-y-archivos-clave)
2. [Variables de entorno](#variables-de-entorno)
3. [Flujos soportados](#flujos-soportados)
   - [Login (USER_PASSWORD_AUTH)](#login-user_password_auth)
   - [Refresh (REFRESH_TOKEN_AUTH)](#refresh-refresh_token_auth)
   - [Logout](#logout)
4. [Cookies y política de sesión](#cookies-y-política-de-sesión)
5. [Intercepción en el cliente (Axios)](#intercepción-en-el-cliente-axios)
6. [Route Guards](#route-guards)
7. [UI: Formulario de Login](#ui-formulario-de-login)
8. [Buenas prácticas y seguridad](#buenas-prácticas-y-seguridad)
9. [Problemas comunes (Troubleshooting)](#problemas-comunes-troubleshooting)
10. [Extensiones recomendadas](#extensiones-recomendadas)

---

## Arquitectura y archivos clave

**Capas relevantes del flujo de auth:**

```
app/
  (auth)/
    login/page.tsx                 # Página pública de login (async, force-dynamic)
  (dashboard)/
    layout.tsx                     # Zona privada, protegida por AuthGuard
  api/
    session/route.ts               # POST login | DELETE logout (set/clear cookies en respuesta)
    session/refresh/route.ts       # POST refresh (renueva access; opcional refresh)
src/
  features/
    auth/
      api/cognito.repo.impl.ts     # Integración directa a Cognito (InitiateAuth)
      lib/usecases/login.ts        # Use cases de login/logout (cliente → /api/session)
      ui/LoginForm.tsx             # Form con react-hook-form + zod
  processes/
    auth/guard.tsx                 # AuthGuard (Server Component async) para rutas privadas
  shared/
    api/http.client.ts             # Axios en browser (instalación de interceptores)
    api/http.server.ts             # Axios en server (Cognito, retry, error handling)
    config/env.ts                  # Zod + tipado de variables de entorno
    interceptors/
      auth.ts                      # Interceptor 401 → refresh queue → retry
      error.ts                     # Normalizador ApiError {code, message, details}
```

> **Notas**
>
> - Todo texto/mensaje visible en UI o consola está en **inglés** (la documentación en este README es en **español**).
> - Los comentarios dentro del código explican en español.

---

## Variables de entorno

Archivo base: `.env.local` (desarrollo).  
Validación en: `src/shared/config/env.ts`.

### App y HTTP

```dotenv
NEXT_PUBLIC_APP_NAME="KMA Web"
NEXT_PUBLIC_APP_ENV="development"
NEXT_PUBLIC_HTTP_TIMEOUT_MS="20000"
HTTP_RETRY_MAX_ATTEMPTS="3"
HTTP_RETRY_BASE_DELAY_MS="300"
NEXT_PUBLIC_QUERY_STALE_TIME="30000"
```

### AWS Cognito

```dotenv
NEXT_PUBLIC_AUTH_BASE_URL=****
COGNITO_REGION="us-east-2"
COGNITO_CLIENT_ID=***
```

### Cookies (nombres y políticas)

```dotenv
SESSION_COOKIE_NAME="kma_session"
ACCESS_TOKEN_COOKIE_NAME="kma_access"
REFRESH_TOKEN_COOKIE_NAME="kma_refresh"
COOKIE_SECURE="false"        # En local debe ser false (HTTP). En prod: true (HTTPS).
COOKIE_SAMESITE="Lax"        # 'Lax' | 'Strict' | 'None' (en código se normaliza a minúsculas)
# COOKIE_DOMAIN=".tu-dominio.com"   # No usar en local; en prod si aplica subdominios
```

> **Importante en local**: `COOKIE_SECURE=false` y **no** setear `COOKIE_DOMAIN`, o el navegador no persistirá cookies.

---

## Flujos soportados

### Login (`USER_PASSWORD_AUTH`)

**Secuencia:**

1. `LoginForm` valida (zod) y llama `loginWithPassword({ username, password })`.
2. `loginWithPassword` → `POST /api/session` (route handler).
3. `/api/session` invoca `initiateAuthWithPassword` (Cognito).
4. Con la respuesta de Cognito, **setea cookies** en el objeto `NextResponse`.
5. El cliente navega al dashboard.

**Request a Cognito** (headers y body manejados por `cognitoHttp()`):

- `Content-Type: application/x-amz-json-1.1`
- `X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth`
- Body:
  ```json
  {
    "AuthFlow": "USER_PASSWORD_AUTH",
    "ClientId": "<COGNITO_CLIENT_ID>",
    "AuthParameters": { "USERNAME": "<user>", "PASSWORD": "<pass>" }
  }
  ```

**Errores** se normalizan a `ApiError { code, message, details }`.  
Ej.: `NotAuthorizedException` → `401` con `message: "Incorrect username or password."`.

---

### Refresh (`REFRESH_TOKEN_AUTH`)

**Cuándo sucede:**

- El **interceptor de auth (cliente)** detecta un **401** en una request a `/api/*`.
- Dispara **una sola** llamada a `POST /api/session/refresh` (refresh queue).
- Si el refresh devuelve 200, reintenta la request original.

**Route handler `/api/session/refresh`**:

- Lee `kma_refresh` (cookie httpOnly).
- Llama `initiateAuthWithRefreshToken(refresh)`.
- Si todo ok, **actualiza `kma_access`** y opcionalmente `kma_refresh` (depende de Cognito).
- Si falla (401), **limpia cookies** y el interceptor propaga `UNAUTHORIZED`.

---

### Logout

**`DELETE /api/session`**:

- Limpia `kma_access`, `kma_refresh` y `kma_session` en el `NextResponse`.
- UI reemplaza navegación a `/login`.

---

## Cookies y política de sesión

| Cookie        | httpOnly | Secure (dev/prod) | SameSite | Path | Dominio          | Contenido                          |
| ------------- | -------- | ----------------- | -------- | ---- | ---------------- | ---------------------------------- |
| `kma_access`  | Sí       | No / Sí           | lax      | `/`  | (vacío/definido) | **Access Token** (JWT de Cognito)  |
| `kma_refresh` | Sí       | No / Sí           | lax      | `/`  | (vacío/definido) | **Refresh Token**                  |
| `kma_session` | No       | No / Sí           | lax      | `/`  | (vacío/definido) | **Flag** no sensible (valor `"1"`) |

> En **/login** se redirige al dashboard **solo** si existe **`kma_access`**.  
> En el **AuthGuard** se recomienda depender de `kma_access` (consistente).

---

## Intercepción en el cliente (Axios)

**Archivo:** `src/shared/interceptors/auth.ts`

- Detecta **401** en `/api/*` (mismo origen).
- Evita loops excluyendo `/api/session` y `/api/session/refresh`.
- Implementa **refresh queue**: en caso de múltiples 401 simultáneos, realiza **una sola** llamada a refresh y reintenta todas las requests cuando finaliza.
- En caso de fallo de refresh, lanza `ApiError` con `code: "UNAUTHORIZED"`.

**Instalación (client):**

```ts
// src/shared/api/http.client.ts
import { installAuthInterceptor } from "@shared/interceptors/auth";
import { installErrorInterceptor } from "@shared/interceptors/error";

installErrorInterceptor(httpClient);
installAuthInterceptor(httpClient);
```

**Servidor:** `http.server.ts` aplica manejo de errores y **retry/backoff** (429/5xx).

---

## Route Guards

**Privado**: `src/processes/auth/guard.tsx` (Server Component **async**)

- Lee cookies (`await cookies()`).
- Si **no** hay `kma_access` → `redirect("/login")`.
- Se usa en `app/(dashboard)/layout.tsx` para proteger rutas hijas.

**Pública (opcional)**: Guest Guard en `(auth)`

- Redirige a dashboard si **hay** `kma_access`.
- Alternativa: lógica ya incluida en `app/(auth)/login/page.tsx` (force-dynamic + redirect si access).

---

## UI: Formulario de Login

**Archivo:** `src/features/auth/ui/LoginForm.tsx`

- `react-hook-form` + `zod` para validación.
- Llama `loginWithPassword` (use case).
- Navega al dashboard (recomendado `router.replace("/dashboard")` o navegación dura en el primer setup).
- **Mensajes en inglés** (consistencia global).

---

## Buenas prácticas y seguridad

- **Tokens en cookies httpOnly**: nunca en `localStorage`/`sessionStorage`.
- **Secure**: `true` en producción (HTTPS obligatorio), `false` en local.
- **SameSite**: `lax` por defecto; evaluar `strict` si UX lo permite.
- **Dominio**: **no** setear en local; en prod usar `COOKIE_DOMAIN` si hay subdominios.
- **Rate Limiting**: aplicar en `/api/session` y `/api/session/refresh` (p. ej., Upstash Redis).
- **CSRF**: cuando se agreguen POST/PUT/DELETE a APIs propias desde el browser (más allá de login), sumar anti-CSRF (cookie + header/token).
- **Observabilidad**: loguear eventos clave (login OK/fail, refresh, logout) y métricas (401/429/5xx).
- **RBAC**: usar claims del JWT (`cognito:groups`) para ocultar/denegar UI y llamadas.

---

## Problemas comunes (Troubleshooting)

1. **Loop / Redirecciones inesperadas**

   - Verificar que `/login` esté con:
     ```ts
     export const revalidate = 0;
     export const dynamic = "force-dynamic";
     ```
   - En `/login` **solo** redirigir si hay `kma_access`.
   - Confirmar en **DevTools → Application → Cookies**:
     - En **login OK**: aparecen `kma_access`, `kma_refresh`, `kma_session`.
     - En **logout**: todas vaciadas (maxAge=0).

2. **Cookies no se guardan en local**

   - `COOKIE_SECURE=false`.
   - **No** usar `COOKIE_DOMAIN`.
   - `SameSite` en minúsculas en `NextResponse.cookies.set`.

3. **401 después de expirar access token**

   - Chequear que el interceptor de **auth** esté instalado en `httpClient`.
   - Confirmar que `/api/session/refresh` devuelve 200 y renueva `kma_access`.

4. **Mensajes de Next “cookies() should be awaited”**
   - En server components/route handlers: usar `const jar = await cookies()`.

---

## Diagrama de secuencia (resumen)

```
LoginForm --(POST /api/session)--> Route Handler --(InitiateAuth)--> Cognito
LoginForm <--(200 + Set-Cookie)--- Route Handler
Browser: kma_access, kma_refresh, kma_session establecidos
LoginForm --(navigate)--> /dashboard
AuthGuard (server) --(cookies)--> detecta kma_access → allow

[Access expira]
Feature --(GET /api/xxx)--> Server 401
httpClient(auth interceptor):
  ├─(POST /api/session/refresh)→ Route Handler → Cognito
  └─200 OK → reintenta request original → 200 OK
```

---

## Conclusión

El flujo implementado asegura:

- **Autenticación segura** con Cognito usando **cookies httpOnly**.
- **Protección de rutas** en el servidor (App Router).
- **Renovación automática** del `access token` mediante **refresh queue**.
- **Errores normalizados** y **validación estricta** de entorno y formularios.

Cualquier ampliación (RBAC, CSRF, status endpoint, decodificación de JWT para UI, rate limiting) puede sumarse incrementalmente sin romper la arquitectura actual.
