// ---------------------------------------------------------------------------
// Tests para la instancia de Axios del navegador (http.client).
//
// El módulo tiene efectos al importarse (lee PublicEnv y monta interceptores),
// por eso cada caso hace vi.stubEnv + vi.resetModules() + import() dinámico.
// La red se corta reemplazando el adapter de la instancia.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = "https://api.example.com";

/** Variables públicas mínimas que exige el schema de zod en env.ts. */
function stubPublicEnv(apiBaseUrl = API_BASE_URL) {
  vi.stubEnv("NEXT_PUBLIC_APP_NAME", "KMA");
  vi.stubEnv("NEXT_PUBLIC_APP_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_AUTH_BASE_URL", "https://auth.example.com");
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", apiBaseUrl);
  vi.stubEnv("NEXT_PUBLIC_HTTP_TIMEOUT_MS", "12345");
  vi.stubEnv("NEXT_PUBLIC_QUERY_STALE_TIME", "30000");
}

type Captured = InternalAxiosRequestConfig | null;

/**
 * Importa una instancia fresca de httpClient y le enchufa un adapter que
 * captura la config final y devuelve el status pedido.
 */
async function loadClient(status = 200, data: unknown = { ok: true }) {
  const mod = await import("../http.client");
  const client = mod.httpClient as AxiosInstance;
  const captured: { config: Captured } = { config: null };

  client.defaults.adapter = async (config) => {
    captured.config = config as InternalAxiosRequestConfig;
    const res = {
      status,
      statusText: status === 200 ? "OK" : "Error",
      data,
      headers: {},
      config,
    } as unknown as AxiosResponse;

    if (status >= 400) {
      const { AxiosError } = await import("axios");
      throw new AxiosError(
        `Request failed with status code ${status}`,
        "ERR_BAD_RESPONSE",
        config,
        null,
        res
      );
    }
    return res;
  };

  return { client, captured, mod };
}

/** Lee un header sin importar si es AxiosHeaders u objeto plano. */
function readHeader(config: Captured, name: string): unknown {
  const headers = config?.headers as unknown as
    | { get?: (k: string) => unknown }
    | Record<string, unknown>
    | undefined;
  if (!headers) return undefined;
  if (typeof (headers as { get?: unknown }).get === "function") {
    return (headers as { get: (k: string) => unknown }).get(name);
  }
  return (headers as Record<string, unknown>)[name];
}

beforeEach(() => {
  vi.resetModules();
  stubPublicEnv();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Configuración de la instancia
// ---------------------------------------------------------------------------

describe("httpClient defaults", () => {
  it("builds the instance from PublicEnv", async () => {
    const { client } = await loadClient();

    expect(client.defaults.baseURL).toBe(API_BASE_URL);
    expect(client.defaults.timeout).toBe(12345);
    expect(client.defaults.withCredentials).toBe(true);
    expect(client.defaults.headers.Accept).toBe("application/json");
  });

  it("exports the same instance as default export", async () => {
    const { client, mod } = await loadClient();
    expect(mod.default).toBe(client);
  });
});

// ---------------------------------------------------------------------------
// Request interceptor: resolución de baseURL
// ---------------------------------------------------------------------------

describe("httpClient request interceptor — baseURL resolution", () => {
  it("forces same-origin for internal /api/ routes", async () => {
    const { client, captured } = await loadClient();

    await client.get("/api/session");

    expect(captured.config?.baseURL).toBe("");
    expect(captured.config?.url).toBe("/api/session");
  });

  it.each([
    ["http://other.example.com/things", "http"],
    ["https://other.example.com/things", "https"],
  ])("leaves absolute %s untouched (%s)", async (url) => {
    const { client, captured } = await loadClient();

    await client.get(url);

    // La baseURL de la instancia se conserva; axios ignora baseURL en absolutas.
    expect(captured.config?.baseURL).toBe(API_BASE_URL);
    expect(captured.config?.url).toBe(url);
  });

  it("applies the public base URL to relative external routes without baseURL", async () => {
    const { client, captured } = await loadClient();

    await client.get("/audits", { baseURL: "" });

    expect(captured.config?.baseURL).toBe(API_BASE_URL);
  });

  it("keeps an explicit baseURL for relative external routes", async () => {
    const { client, captured } = await loadClient();

    await client.get("/audits", { baseURL: "https://other.example.com" });

    expect(captured.config?.baseURL).toBe("https://other.example.com");
  });

  it("does not force same-origin for an absolute URL containing /api/", async () => {
    const { client, captured } = await loadClient();

    await client.get("https://other.example.com/api/session");

    expect(captured.config?.baseURL).toBe(API_BASE_URL);
  });
});

// ---------------------------------------------------------------------------
// Request interceptor: Content-Type por defecto
// ---------------------------------------------------------------------------

describe("httpClient request interceptor — default Content-Type", () => {
  it.each(["post", "put", "patch"] as const)(
    "sets application/json for %s when absent",
    async (method) => {
      const { client, captured } = await loadClient();

      await client.request({ url: "/api/things", method, data: { a: 1 } });

      expect(readHeader(captured.config, "Content-Type")).toBe(
        "application/json"
      );
    }
  );

  it.each([
    ["Content-Type", "multipart/form-data"],
    ["content-type", "text/plain"],
  ])("respects an explicit %s header", async (headerName, value) => {
    const { client, captured } = await loadClient();

    await client.request({
      url: "/api/things",
      method: "post",
      data: { a: 1 },
      headers: { [headerName]: value },
    });

    expect(readHeader(captured.config, "Content-Type")).toBe(value);
  });

  it.each(["get", "delete"] as const)(
    "does not add Content-Type for %s",
    async (method) => {
      const { client, captured } = await loadClient();

      await client.request({ url: "/api/things", method });

      // El interceptor no toca métodos sin cuerpo.
      expect(readHeader(captured.config, "Content-Type")).toBeFalsy();
    }
  );

  // Con axios 1.x los headers mergeados ya traen la clave "Content-Type" con
  // valor undefined, así que comprobar `"Content-Type" in headers` volvía el
  // default código muerto: un body string terminaba en
  // application/x-www-form-urlencoded. Ahora se mira el valor, no la clave.
  it("applies the JSON default to a raw string body", async () => {
    const { client, captured } = await loadClient();

    await client.post("/api/things", "raw-body");

    expect(readHeader(captured.config, "Content-Type")).toBe(
      "application/json"
    );
  });

  it("exposes the Content-Type key already present in the merged headers", async () => {
    const { client, captured } = await loadClient();

    await client.request({ url: "/api/things", method: "post", data: { a: 1 } });

    const hdrs = captured.config?.headers as unknown as Record<string, unknown>;
    expect(Object.keys(hdrs)).toContain("Content-Type");
  });
});

// ---------------------------------------------------------------------------
// Request interceptor: handler de rechazo
// ---------------------------------------------------------------------------

describe("httpClient request interceptor — rejection handler", () => {
  /** Devuelve el handler `rejected` del último interceptor de request. */
  async function getRejectedHandler(client: AxiosInstance) {
    const handlers = (
      client.interceptors.request as unknown as {
        handlers: Array<{ rejected?: (e: unknown) => unknown }>;
      }
    ).handlers;
    return handlers[handlers.length - 1]?.rejected;
  }

  it("wraps the original message into an Error", async () => {
    const { client } = await loadClient();
    const rejected = await getRejectedHandler(client);

    await expect(rejected?.({ message: "boom" })).rejects.toThrow("boom");
  });

  it.each([[undefined], [null], [{}], [{ message: "" }]])(
    "uses the generic message when the error carries none (%j)",
    async (input) => {
      const { client } = await loadClient();
      const rejected = await getRejectedHandler(client);

      await expect(rejected?.(input)).rejects.toThrow(
        "Request interceptor failed before sending the request."
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Interceptores de respuesta montados sobre la instancia
// ---------------------------------------------------------------------------

describe("httpClient response interceptors", () => {
  it("passes 2xx responses through untouched", async () => {
    const { client } = await loadClient(200, { hello: "world" });

    const res = await client.get("/api/things");

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ hello: "world" });
  });

  // El orden de instalación (auth y despues error) hace que el error que llega
  // al consumidor sea siempre el ApiError normalizado por installErrorInterceptor.
  it.each([
    [400, "BAD_REQUEST"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [409, "CONFLICT"],
    [429, "RATE_LIMITED"],
    [500, "SERVER_ERROR"],
    [503, "SERVER_ERROR"],
  ])("normalises HTTP %i into code %s", async (status, expectedCode) => {
    const { client } = await loadClient(status, { message: "nope" });

    await expect(client.get("/api/things")).rejects.toMatchObject({
      code: expectedCode,
      message: "nope",
    });
  });

  it("keeps the HTTP status, url and method inside details", async () => {
    const { client } = await loadClient(503, { message: "unavailable" });

    await expect(client.get("/api/things")).rejects.toMatchObject({
      details: { status: 503, url: "/api/things", method: "GET" },
    });
  });

  it("normalises a body without message using the default text", async () => {
    const { client } = await loadClient(500, {});

    await expect(client.get("/api/things")).rejects.toMatchObject({
      code: "SERVER_ERROR",
      message: "Request failed with status code 500",
    });
  });

  // Un 401 sobre una URL que NO es /api/ no dispara el refresh del auth
  // interceptor: se propaga normalizado como UNAUTHORIZED.
  it("propagates a 401 on a non-api URL without attempting a refresh", async () => {
    const { client } = await loadClient(401, { message: "nope" });

    await expect(
      client.get("/external/thing", { baseURL: "" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
