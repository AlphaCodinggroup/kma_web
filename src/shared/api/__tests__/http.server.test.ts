/**
 * http.server usa next/headers y serverEnv, por eso corre en entorno node.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

// --- Cookie jar controlable desde cada caso -------------------------------
const cookieState: { value: string | undefined; throws: boolean } = {
  value: undefined,
  throws: false,
};

vi.mock("next/headers", () => ({
  cookies: async () => {
    if (cookieState.throws) {
      throw new Error("cookies() unavailable outside a request scope");
    }
    return {
      get: (name: string) =>
        name === "kma_access" && cookieState.value
          ? { name, value: cookieState.value }
          : undefined,
    };
  },
}));

/** Variables de entorno mínimas para publicEnv() y serverEnv(). */
function stubEnv(overrides: Record<string, string> = {}) {
  const base: Record<string, string> = {
    NEXT_PUBLIC_APP_NAME: "KMA",
    NEXT_PUBLIC_APP_ENV: "development",
    NEXT_PUBLIC_AUTH_BASE_URL: "https://cognito-idp.us-east-2.amazonaws.com",
    NEXT_PUBLIC_API_BASE_URL: "https://api.example.com",
    NEXT_PUBLIC_HTTP_TIMEOUT_MS: "5000",
    NEXT_PUBLIC_QUERY_STALE_TIME: "30000",
    COGNITO_REGION: "us-east-2",
    COGNITO_CLIENT_ID: "client-123",
    SESSION_COOKIE_NAME: "kma_session",
    ACCESS_TOKEN_COOKIE_NAME: "kma_access",
    REFRESH_TOKEN_COOKIE_NAME: "kma_refresh",
    COOKIE_SECURE: "false",
    COOKIE_SAMESITE: "Lax",
    HTTP_RETRY_MAX_ATTEMPTS: "2",
    HTTP_RETRY_BASE_DELAY_MS: "1",
    ...overrides,
  };
  for (const [k, v] of Object.entries(base)) vi.stubEnv(k, v);
}

type Captured = InternalAxiosRequestConfig[];

/** Adapter que devuelve siempre la misma respuesta y registra las configs. */
function stubAdapter(
  instance: AxiosInstance,
  responder: (
    config: InternalAxiosRequestConfig,
    attempt: number
  ) => Partial<AxiosResponse> | Promise<Partial<AxiosResponse>>
): Captured {
  const seen: Captured = [];
  instance.defaults.adapter = async (config) => {
    const cfg = config as InternalAxiosRequestConfig;
    seen.push(cfg);
    const partial = await responder(cfg, seen.length - 1);
    return {
      status: 200,
      statusText: "OK",
      data: {},
      headers: {},
      config: cfg,
      ...partial,
    } as AxiosResponse;
  };
  return seen;
}

/** Lee un header del config capturado, sea AxiosHeaders u objeto plano. */
function headerOf(config: InternalAxiosRequestConfig | undefined, key: string) {
  const h = config?.headers as unknown;
  if (!h) return undefined;
  if (h instanceof AxiosHeaders) return h.get(key);
  return (h as Record<string, unknown>)[key];
}

beforeEach(() => {
  vi.resetModules();
  cookieState.value = undefined;
  cookieState.throws = false;
  stubEnv();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// createServerHttp — configuración base
// ---------------------------------------------------------------------------

describe("createServerHttp", () => {
  it("creates an instance with the documented defaults", async () => {
    const { createServerHttp } = await import("../http.server");
    const instance = createServerHttp();

    expect(instance.defaults.baseURL).toBe("/");
    expect(instance.defaults.timeout).toBe(30_000);
    expect(instance.defaults.withCredentials).toBe(false);
    expect(instance.defaults.headers.Accept).toBe("application/json");
    // validateStatus siempre true: el manejo de errores lo hace el interceptor.
    expect(instance.defaults.validateStatus?.(500)).toBe(true);
  });

  it("honours an explicit baseURL", async () => {
    const { createServerHttp } = await import("../http.server");
    const instance = createServerHttp({ baseURL: "https://upstream.test" });

    expect(instance.defaults.baseURL).toBe("https://upstream.test");
  });

  it("merges initial headers passed as a plain object", async () => {
    const { createServerHttp } = await import("../http.server");
    const instance = createServerHttp({
      headers: { "X-Custom": "yes", "X-Skipped": undefined },
    });
    const seen = stubAdapter(instance, () => ({}));

    await instance.get("/things");

    expect(headerOf(seen[0], "X-Custom")).toBe("yes");
    expect(headerOf(seen[0], "X-Skipped")).toBeFalsy();
  });

  it("merges initial headers passed as AxiosHeaders", async () => {
    const { createServerHttp } = await import("../http.server");
    const instance = createServerHttp({
      headers: new AxiosHeaders({ "X-From-AxiosHeaders": "1" }),
    });
    const seen = stubAdapter(instance, () => ({}));

    await instance.get("/things");

    expect(headerOf(seen[0], "X-From-AxiosHeaders")).toBe("1");
  });
});

// ---------------------------------------------------------------------------
// Request interceptor — Authorization desde cookie httpOnly
// ---------------------------------------------------------------------------

describe("createServerHttp — auth cookie", () => {
  it("attaches Authorization when the cookie is present", async () => {
    cookieState.value = "token-abc";
    const { createServerHttp } = await import("../http.server");
    const instance = createServerHttp({ withAuthCookie: true });
    const seen = stubAdapter(instance, () => ({}));

    await instance.get("/things");

    expect(headerOf(seen[0], "Authorization")).toBe("Bearer token-abc");
  });

  it.each([
    ["the cookie is missing", { value: undefined, throws: false }],
    ["cookies() throws", { value: "token-abc", throws: true }],
  ])("omits Authorization when %s", async (_label, state) => {
    cookieState.value = state.value;
    cookieState.throws = state.throws;

    const { createServerHttp } = await import("../http.server");
    const instance = createServerHttp({ withAuthCookie: true });
    const seen = stubAdapter(instance, () => ({}));

    await expect(instance.get("/things")).resolves.toBeDefined();
    expect(headerOf(seen[0], "Authorization")).toBeFalsy();
  });

  it("does not read cookies when withAuthCookie is false", async () => {
    cookieState.value = "token-abc";
    const { createServerHttp } = await import("../http.server");
    const instance = createServerHttp({ withAuthCookie: false });
    const seen = stubAdapter(instance, () => ({}));

    await instance.get("/things");

    expect(headerOf(seen[0], "Authorization")).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// Response interceptor — éxito, errores y retry con backoff
// ---------------------------------------------------------------------------

describe("createServerHttp — response handling", () => {
  it("returns 2xx responses untouched", async () => {
    const { createServerHttp } = await import("../http.server");
    const instance = createServerHttp();
    stubAdapter(instance, () => ({ status: 200, data: { ok: true } }));

    const res = await instance.get("/things");

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ ok: true });
  });

  it.each([
    [400, "Bad Request"],
    [404, "Not Found"],
    [409, "Conflict"],
  ])(
    "throws for HTTP %i without retrying and formats the message",
    async (status, statusText) => {
      const { createServerHttp } = await import("../http.server");
      const instance = createServerHttp();
      const seen = stubAdapter(instance, () => ({
        status,
        statusText,
        data: {},
      }));

      await expect(instance.get("/things")).rejects.toThrow(
        `HTTP ${status} ${statusText} on "/things"`
      );
      expect(seen).toHaveLength(1);
    }
  );

  it("prefers the server message from the JSON body", async () => {
    const { createServerHttp } = await import("../http.server");
    const instance = createServerHttp();
    stubAdapter(instance, () => ({
      status: 422,
      statusText: "Unprocessable Entity",
      data: { message: "Field name is required" },
    }));

    await expect(instance.get("/things")).rejects.toThrow(
      "Field name is required"
    );
  });

  it("uses a plain string body as the message", async () => {
    const { createServerHttp } = await import("../http.server");
    const instance = createServerHttp();
    stubAdapter(instance, () => ({
      status: 403,
      statusText: "Forbidden",
      data: "not allowed",
    }));

    await expect(instance.get("/things")).rejects.toThrow("not allowed");
  });

  it("attaches status, url and the raw response to the thrown error", async () => {
    const { createServerHttp } = await import("../http.server");
    const instance = createServerHttp();
    stubAdapter(instance, () => ({ status: 404, statusText: "", data: {} }));

    const err = (await instance
      .get("/things/42")
      .catch((e: unknown) => e)) as Error & {
      status?: number;
      url?: string;
      response?: AxiosResponse;
    };

    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(404);
    expect(err.url).toBe("/things/42");
    expect(err.response?.status).toBe(404);
    // Sin statusText el mensaje no arrastra el separador extra.
    expect(err.message).toBe('HTTP 404 on "/things/42"');
  });

  it.each([[429], [500], [503]])(
    "retries HTTP %i and resolves when the upstream recovers",
    async (status) => {
      const { createServerHttp } = await import("../http.server");
      const instance = createServerHttp();
      const seen = stubAdapter(instance, (_cfg, attempt) =>
        attempt === 0
          ? { status, statusText: "Retryable", data: {} }
          : { status: 200, data: { recovered: true } }
      );

      const res = await instance.get("/things");

      expect(res.data).toEqual({ recovered: true });
      expect(seen).toHaveLength(2);
    }
  );

  it("stops retrying after the configured max attempts", async () => {
    const { createServerHttp } = await import("../http.server");
    const instance = createServerHttp();
    const seen = stubAdapter(instance, () => ({
      status: 500,
      statusText: "Internal Server Error",
      data: {},
    }));

    await expect(instance.get("/things")).rejects.toThrow(
      'HTTP 500 Internal Server Error on "/things"'
    );
    // maxAttempts = 2 → 1 intento inicial + 2 reintentos.
    expect(seen).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Response interceptor — errores previos a la respuesta (red, DNS, timeout)
// ---------------------------------------------------------------------------

describe("createServerHttp — network errors", () => {
  it.each([
    [
      "the upstream payload message",
      new AxiosError("connect ECONNREFUSED", "ECONNREFUSED", undefined, null, {
        status: 502,
        statusText: "Bad Gateway",
        data: { message: "upstream is down" },
        headers: {},
        config: { headers: new AxiosHeaders() },
      } as AxiosResponse),
      "upstream is down",
    ],
    [
      "the axios message",
      new AxiosError("timeout of 30000ms exceeded", "ECONNABORTED"),
      "timeout of 30000ms exceeded",
    ],
    ["the generic fallback", new AxiosError(""), "Network request failed."],
  ])("uses %s", async (_label, thrown, expected) => {
    const { createServerHttp } = await import("../http.server");
    const instance = createServerHttp();
    instance.defaults.adapter = async () => {
      throw thrown;
    };

    const err = (await instance
      .get("/things")
      .catch((e: unknown) => e)) as Error & { cause?: unknown };

    expect(err.message).toBe(expected);
    expect(err.cause).toBe(thrown);
  });
});

// ---------------------------------------------------------------------------
// Atajos de conveniencia
// ---------------------------------------------------------------------------

describe("serverHttp / cognitoHttp", () => {
  it("serverHttp uses the default relative base URL", async () => {
    const { serverHttp } = await import("../http.server");
    expect(serverHttp().defaults.baseURL).toBe("/");
  });

  it("cognitoHttp targets the public auth base URL with Cognito headers", async () => {
    const { cognitoHttp } = await import("../http.server");
    const instance = cognitoHttp();
    const seen = stubAdapter(instance, () => ({}));

    expect(instance.defaults.baseURL).toBe(
      "https://cognito-idp.us-east-2.amazonaws.com"
    );

    await instance.post("/", { AuthFlow: "USER_PASSWORD_AUTH" });

    expect(headerOf(seen[0], "Content-Type")).toBe("application/x-amz-json-1.1");
    expect(headerOf(seen[0], "X-Amz-Target")).toBe(
      "AWSCognitoIdentityProviderService.InitiateAuth"
    );
  });

  it("cognitoHttp does not attach the auth cookie", async () => {
    cookieState.value = "token-abc";
    const { cognitoHttp } = await import("../http.server");
    const instance = cognitoHttp();
    const seen = stubAdapter(instance, () => ({}));

    await instance.post("/", {});

    expect(headerOf(seen[0], "Authorization")).toBeFalsy();
  });
});
