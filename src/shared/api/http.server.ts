import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type RawAxiosRequestHeaders,
} from "axios";
import { cookies } from "next/headers";
import { serverEnv, PublicEnv } from "@shared/config/env";

// --- utilidades de backoff (exponential with full jitter) --------------------
function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function expoJitterDelay(attempt: number, baseMs: number) {
  // baseMs * 2^attempt, con jitter para evitar thundering herd
  const cap = baseMs * Math.pow(2, attempt);
  return Math.floor(Math.random() * cap);
}

// --- Tipado de opciones ------------------------------------------------------
type CreateServerHttpOptions = {
  /** Base URL (string definido; por defecto "/"). */
  baseURL?: string;
  /** Headers iniciales (admite objeto plano o AxiosHeaders). */
  headers?: RawAxiosRequestHeaders | AxiosHeaders;
  /**
   * Si true, adjunta Authorization: Bearer <token> leyendo la cookie httpOnly
   * configurada en .env (ACCESS_TOKEN_COOKIE_NAME).
   */
  withAuthCookie?: boolean;
};

// --- Helper: setear header sin romper AxiosHeaders ---------------------------
function setHeaderSafe(
  config: AxiosRequestConfig,
  key: string,
  value: string
): void {
  // Si hay instancia AxiosHeaders, usamos su API .set()
  const h = config.headers as AxiosHeaders | RawAxiosRequestHeaders | undefined;
  if (h && typeof (h as AxiosHeaders).set === "function") {
    (h as AxiosHeaders).set(key, value);
    return;
  }
  // Si no hay headers o es objeto plano, aseguramos objeto y asignamos
  if (!config.headers) {
    config.headers = {} as RawAxiosRequestHeaders;
  }
  (config.headers as RawAxiosRequestHeaders)[key] = value;
}

// --- Fábrica de instancias para server --------------------------------------
export function createServerHttp(
  opts?: CreateServerHttpOptions
): AxiosInstance {
  const env = serverEnv();

  const instance = axios.create({
    baseURL: opts?.baseURL ?? "/",
    timeout: 30_000,
    headers: {
      Accept: "application/json",
    },
    withCredentials: false,
    validateStatus: () => true,
  });

  // Si se pasaron headers iniciales, los seteamos de forma segura
  if (opts?.headers) {
    const initialCfg = instance.defaults;
    const incoming =
      opts.headers instanceof AxiosHeaders
        ? (opts.headers as AxiosHeaders).toJSON()
        : (opts.headers as RawAxiosRequestHeaders);
    Object.entries(incoming).forEach(([k, v]) => {
      if (typeof v === "undefined") return;
      setHeaderSafe(initialCfg as AxiosRequestConfig, k, String(v));
    });
  }

  // --- Request interceptor: Authorization desde cookie (opcional) -----------
  instance.interceptors.request.use(async (config) => {
    // Adjunta Authorization: Bearer desde cookie httpOnly si se pidió
    if (opts?.withAuthCookie) {
      try {
        const jar = await cookies();
        const accessName = env.cookies.accessName;
        const raw = jar.get(accessName)?.value;
        if (raw) {
          setHeaderSafe(config, "Authorization", `Bearer ${raw}`);
        }
      } catch {}
    }
    return config;
  });

  // --- Response interceptor: retry/backoff + normalización de errores -------
  instance.interceptors.response.use(
    async (res) => {
      // Éxito (2xx)
      if (res.status >= 200 && res.status < 300) return res;

      const { httpRetry } = env;
      const cfg = (res.config ?? {}) as AxiosRequestConfig & {
        __retryCount?: number; // contador interno de reintentos
      };

      const status = res.status;
      const shouldRetry = status === 429 || (status >= 500 && status <= 599);

      if (shouldRetry) {
        const attempt = cfg.__retryCount ?? 0;
        if (attempt < httpRetry.maxAttempts) {
          cfg.__retryCount = attempt + 1;
          const delay = expoJitterDelay(attempt, httpRetry.baseDelayMs);
          await sleep(delay);
          return instance.request(cfg);
        }
      }

      const url = res.config?.url ?? "";
      const statusText = res.statusText || "";
      const serverMessage =
        (res.data && (res.data as any).message) ||
        (typeof res.data === "string" ? res.data : undefined);

      const error = new Error(
        serverMessage
          ? serverMessage
          : `HTTP ${status}${statusText ? ` ${statusText}` : ""} on "${url}"`
      );
      (error as any).status = status;
      (error as any).url = url;
      (error as any).response = res;

      throw error;
    },
    (err: AxiosError) => {
      // Errores previos a respuesta (DNS, timeout, etc.)
      const msg =
        (err.response?.data as any)?.message ||
        err.message ||
        "Network request failed.";
      const error = new Error(msg);
      (error as any).cause = err;
      throw error;
    }
  );

  return instance;
}

// --- Atajos de conveniencia --------------------------------------------------

// Cliente genérico para llamar APIs internas (mismo host) desde server.
export function serverHttp(): AxiosInstance {
  return createServerHttp();
}

// Cliente específico para AWS Cognito (InitiateAuth).
// *No* agrega Authorization por cookie; setea los headers requeridos por Cognito.
// BaseURL se toma de PublicEnv.authBaseUrl.
export function cognitoHttp(): AxiosInstance {
  return createServerHttp({
    baseURL: PublicEnv.authBaseUrl,
    headers: {
      // Headers requeridos por Cognito para InitiateAuth
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
    },
    withAuthCookie: false,
  });
}
