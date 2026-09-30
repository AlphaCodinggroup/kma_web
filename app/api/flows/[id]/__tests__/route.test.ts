/**
 * Route handler de servidor.
 *
 * @vitest-environment node
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const cookieStore = { value: undefined as string | undefined };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "kma_access" && cookieStore.value
        ? { name, value: cookieStore.value }
        : undefined,
  }),
}));

/** Declara todas las variables que zod valida al cargar el entorno. */
function stubEnv() {
  vi.stubEnv("NEXT_PUBLIC_APP_NAME", "KMA");
  vi.stubEnv("NEXT_PUBLIC_APP_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_AUTH_BASE_URL", "https://auth.example.com");
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.com/api");
  vi.stubEnv("NEXT_PUBLIC_HTTP_TIMEOUT_MS", "5000");
  vi.stubEnv("NEXT_PUBLIC_QUERY_STALE_TIME", "30000");
  vi.stubEnv("COGNITO_REGION", "us-east-2");
  vi.stubEnv("COGNITO_CLIENT_ID", "client");
  vi.stubEnv("SESSION_COOKIE_NAME", "kma_session");
  vi.stubEnv("ACCESS_TOKEN_COOKIE_NAME", "kma_access");
  vi.stubEnv("REFRESH_TOKEN_COOKIE_NAME", "kma_refresh");
  vi.stubEnv("COOKIE_SECURE", "false");
  vi.stubEnv("COOKIE_SAMESITE", "Lax");
  vi.stubEnv("HTTP_RETRY_MAX_ATTEMPTS", "3");
  vi.stubEnv("HTTP_RETRY_BASE_DELAY_MS", "100");
}

/** Respuesta JSON simulada del backend. */
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Petición entrante al BFF. */
function request(url: string, init?: RequestInit) {
  return new NextRequest(new Request(url, init));
}

/** Fetch que falla como si el backend no estuviera disponible. */
function failingFetch() {
  return vi.fn(async () => {
    throw new Error("ECONNREFUSED");
  });
}

/** Argumentos con los que el handler llamó a fetch. */
type FetchArgs = [string | URL, RequestInit];

/** Errores del backend que la ruta debe propagar tal cual. */
const UPSTREAM_ERRORS: Array<[number, Record<string, string>]> = [
  [404, { code: "NOT_FOUND", message: "not found" }],
  [422, { code: "VALIDATION_ERROR", message: "invalid payload" }],
  [500, { code: "SERVER_ERROR", message: "boom" }],
];

/** Contexto de ruta dinámica con el id del flujo. */
function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

const url = "http://localhost/api/flows/fl-1";
const payload = { name: "Flujo editado" };

/** Petición con cuerpo JSON para PUT. */
function putRequest(target = url, body: string = JSON.stringify(payload)) {
  return request(target, {
    method: "PUT",
    body,
    headers: { "content-type": "application/json" },
  });
}

describe("GET /api/flows/[id]", () => {
  beforeEach(() => {
    vi.resetModules();
    stubEnv();
    cookieStore.value = "token-abc";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns 401 and never reaches the backend without a session cookie", async () => {
    cookieStore.value = undefined;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("../route");
    const res = await GET(request(url), context("fl-1"));

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an empty id with 400 and never reaches the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("../route");
    const res = await GET(request(url), context(""));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      message: "Flow id is required",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the bearer token to the flow endpoint", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "fl-1" }));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("../route");
    const res = await GET(request(url), context("fl-1"));

    expect(res.status).toBe(200);
    const [upstream, init] = fetchMock.mock.calls[0] as unknown as FetchArgs;
    expect(String(upstream)).toBe("https://api.example.com/api/flows/fl-1");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer token-abc"
    );
  });

  // El id se escapa: un segmento con ".." o "/" no alcanza otra ruta.
  it("escapes the id when building the upstream url", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("../route");
    await GET(request(url), context("fl-1/../users"));

    const [upstream] = fetchMock.mock.calls[0] as unknown as FetchArgs;
    expect(String(upstream)).toBe(
      "https://api.example.com/api/flows/fl-1%2F..%2Fusers"
    );
  });

  it("does not forward query params from the incoming request", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("../route");
    await GET(request(`${url}?secret=x`), context("fl-1"));

    const [upstream] = fetchMock.mock.calls[0] as unknown as FetchArgs;
    expect(String(upstream)).not.toContain("secret");
  });

  it.each(UPSTREAM_ERRORS)(
    "propagates the upstream %i and its body",
    async (status, body) => {
      vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(body, status)));

      const { GET } = await import("../route");
      const res = await GET(request(url), context("fl-1"));

      expect(res.status).toBe(status);
      await expect(res.json()).resolves.toEqual(body);
    }
  );

  it("returns 502 when the backend does not answer", async () => {
    vi.stubGlobal("fetch", failingFetch());

    const { GET } = await import("../route");
    const res = await GET(request(url), context("fl-1"));

    expect(res.status).toBe(502);
  });
});

describe("PUT /api/flows/[id]", () => {
  beforeEach(() => {
    vi.resetModules();
    stubEnv();
    cookieStore.value = "token-abc";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns 401 and never reaches the backend without a session cookie", async () => {
    cookieStore.value = undefined;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { PUT } = await import("../route");
    const res = await PUT(putRequest(), context("fl-1"));

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an empty id with 400 and never reaches the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { PUT } = await import("../route");
    const res = await PUT(putRequest(), context(""));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the bearer token and the body to the flow endpoint", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "fl-1" }));
    vi.stubGlobal("fetch", fetchMock);

    const { PUT } = await import("../route");
    const res = await PUT(putRequest(), context("fl-1"));

    expect(res.status).toBe(200);
    const [upstream, init] = fetchMock.mock.calls[0] as unknown as FetchArgs;
    expect(String(upstream)).toBe("https://api.example.com/api/flows/fl-1");
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(JSON.stringify(payload));
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer token-abc"
    );
  });

  it("rejects an invalid JSON body with 400 and never reaches the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { PUT } = await import("../route");
    const res = await PUT(putRequest(url, "no-json"), context("fl-1"));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ message: "Invalid JSON body" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(UPSTREAM_ERRORS)(
    "propagates the upstream %i and its body",
    async (status, body) => {
      vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(body, status)));

      const { PUT } = await import("../route");
      const res = await PUT(putRequest(), context("fl-1"));

      expect(res.status).toBe(status);
      await expect(res.json()).resolves.toEqual(body);
    }
  );

  it("returns 502 when the backend does not answer", async () => {
    vi.stubGlobal("fetch", failingFetch());

    const { PUT } = await import("../route");
    const res = await PUT(putRequest(), context("fl-1"));

    expect(res.status).toBe(502);
  });
});

describe("DELETE /api/flows/[id]", () => {
  beforeEach(() => {
    vi.resetModules();
    stubEnv();
    cookieStore.value = "token-abc";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns 401 and never reaches the backend without a session cookie", async () => {
    cookieStore.value = undefined;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { DELETE } = await import("../route");
    const res = await DELETE(
      request(url, { method: "DELETE" }),
      context("fl-1")
    );

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an empty id with 400 and never reaches the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { DELETE } = await import("../route");
    const res = await DELETE(request(url, { method: "DELETE" }), context(""));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propagates the upstream success status and body", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ deleted: true }, 200));
    vi.stubGlobal("fetch", fetchMock);

    const { DELETE } = await import("../route");
    const res = await DELETE(
      request(url, { method: "DELETE" }),
      context("fl-1")
    );

    // El status del backend se propaga: ya no se reescribe a 204.
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ deleted: true });
    const [upstream, init] = fetchMock.mock.calls[0] as unknown as FetchArgs;
    expect(String(upstream)).toBe("https://api.example.com/api/flows/fl-1");
    expect(init.method).toBe("DELETE");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer token-abc"
    );
  });

  // El cuerpo JSON del backend se propaga tal cual, sin envolverlo en `message`.
  it.each(UPSTREAM_ERRORS)(
    "propagates the upstream %i with its JSON body",
    async (status, body) => {
      vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(body, status)));

      const { DELETE } = await import("../route");
      const res = await DELETE(
        request(url, { method: "DELETE" }),
        context("fl-1")
      );

      expect(res.status).toBe(status);
      await expect(res.json()).resolves.toEqual(body);
    }
  );

  it("returns 502 when the backend does not answer", async () => {
    vi.stubGlobal("fetch", failingFetch());

    const { DELETE } = await import("../route");
    const res = await DELETE(
      request(url, { method: "DELETE" }),
      context("fl-1")
    );

    expect(res.status).toBe(502);
  });
});

/** Respuesta del backend sin JSON (por ejemplo un error del gateway). */
function textResponse(body: string, status: number) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain" },
  });
}

describe("/api/flows/[id] with non JSON upstream responses", () => {
  beforeEach(() => {
    vi.resetModules();
    stubEnv();
    cookieStore.value = "token-abc";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("wraps a plain text upstream error into a message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => textResponse("gateway down", 503)));

    const { GET } = await import("../route");
    const res = await GET(request(url), context("fl-1"));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ message: "gateway down" });
  });

  // Sin texto que envolver, el proxy conserva el status y devuelve null.
  it("propagates the upstream status with a null body when the error body is empty", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => textResponse("", 503)));

    const { PUT } = await import("../route");
    const res = await PUT(putRequest(), context("fl-1"));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toBeNull();
  });

  it.each([
    ["GET", "GET"],
    ["PUT", "PUT"],
    ["DELETE", "DELETE"],
  ])("normalises an upstream 401 on %s without leaking its body", async (_case, method) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ detail: "expired" }, 401))
    );

    const mod = await import("../route");
    const handler =
      method === "GET" ? mod.GET : method === "PUT" ? mod.PUT : mod.DELETE;
    const res = await handler(
      method === "PUT" ? putRequest() : request(url, { method }),
      context("fl-1")
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ message: "Unauthorized" });
  });
});
