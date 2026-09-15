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

/** Contexto de ruta dinámica con el id del proyecto. */
function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

const url = "http://localhost/api/projects/p-1";
const payload = { name: "Proyecto editado" };

/** Petición con cuerpo JSON para PATCH. */
function patchRequest(target = url, body: string = JSON.stringify(payload)) {
  return request(target, {
    method: "PATCH",
    body,
    headers: { "content-type": "application/json" },
  });
}

describe("GET /api/projects/[id]", () => {
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
    const res = await GET(request(url), context("p-1"));

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
      message: "Project id is required",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the bearer token to the project endpoint", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "p-1" }));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("../route");
    const res = await GET(request(url), context("p-1"));

    expect(res.status).toBe(200);
    const [upstream, init] = fetchMock.mock.calls[0] as unknown as FetchArgs;
    expect(String(upstream)).toBe("https://api.example.com/api/projects/p-1");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer token-abc"
    );
  });

  it("escapes the id before building the upstream url", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("../route");
    await GET(request(url), context("p 1/2"));

    const [upstream] = fetchMock.mock.calls[0] as unknown as FetchArgs;
    expect(String(upstream)).toBe(
      "https://api.example.com/api/projects/p%201%2F2"
    );
  });

  it("does not forward query params from the incoming request", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("../route");
    await GET(request(`${url}?secret=x`), context("p-1"));

    const [upstream] = fetchMock.mock.calls[0] as unknown as FetchArgs;
    expect(String(upstream)).not.toContain("secret");
  });

  it.each(UPSTREAM_ERRORS)(
    "propagates the upstream %i and its body",
    async (status, body) => {
      vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(body, status)));

      const { GET } = await import("../route");
      const res = await GET(request(url), context("p-1"));

      expect(res.status).toBe(status);
      await expect(res.json()).resolves.toEqual(body);
    }
  );

  it("returns 502 when the backend does not answer", async () => {
    vi.stubGlobal("fetch", failingFetch());

    const { GET } = await import("../route");
    const res = await GET(request(url), context("p-1"));

    expect(res.status).toBe(502);
  });
});

describe("PATCH /api/projects/[id]", () => {
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

    const { PATCH } = await import("../route");
    const res = await PATCH(patchRequest(), context("p-1"));

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an empty id with 400 and never reaches the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { PATCH } = await import("../route");
    const res = await PATCH(patchRequest(), context(""));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the bearer token and the body to the project endpoint", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "p-1" }));
    vi.stubGlobal("fetch", fetchMock);

    const { PATCH } = await import("../route");
    const res = await PATCH(patchRequest(), context("p-1"));

    expect(res.status).toBe(200);
    const [upstream, init] = fetchMock.mock.calls[0] as unknown as FetchArgs;
    expect(String(upstream)).toBe("https://api.example.com/api/projects/p-1");
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(JSON.stringify(payload));
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer token-abc"
    );
  });

  it("rejects an invalid JSON body with 400 and never reaches the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { PATCH } = await import("../route");
    const res = await PATCH(patchRequest(url, "no-json"), context("p-1"));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ message: "Invalid JSON body" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propagates an upstream 204 without body", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));

    const { PATCH } = await import("../route");
    const res = await PATCH(patchRequest(), context("p-1"));

    expect(res.status).toBe(204);
  });

  it.each(UPSTREAM_ERRORS)(
    "propagates the upstream %i and its body",
    async (status, body) => {
      vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(body, status)));

      const { PATCH } = await import("../route");
      const res = await PATCH(patchRequest(), context("p-1"));

      expect(res.status).toBe(status);
      await expect(res.json()).resolves.toEqual(body);
    }
  );

  it("returns 502 when the backend does not answer", async () => {
    vi.stubGlobal("fetch", failingFetch());

    const { PATCH } = await import("../route");
    const res = await PATCH(patchRequest(), context("p-1"));

    expect(res.status).toBe(502);
  });
});

describe("DELETE /api/projects/[id]", () => {
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
      context("p-1")
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

  it("propagates an upstream 204 without body", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const { DELETE } = await import("../route");
    const res = await DELETE(
      request(url, { method: "DELETE" }),
      context("p-1")
    );

    expect(res.status).toBe(204);
    const [upstream, init] = fetchMock.mock.calls[0] as unknown as FetchArgs;
    expect(String(upstream)).toBe("https://api.example.com/api/projects/p-1");
    expect(init.method).toBe("DELETE");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer token-abc"
    );
  });

  it.each(UPSTREAM_ERRORS)(
    "propagates the upstream %i and its body",
    async (status, body) => {
      vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(body, status)));

      const { DELETE } = await import("../route");
      const res = await DELETE(
        request(url, { method: "DELETE" }),
        context("p-1")
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
      context("p-1")
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

describe("/api/projects/[id] with non JSON upstream responses", () => {
  beforeEach(() => {
    vi.resetModules();
    stubEnv();
    cookieStore.value = "token-abc";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("wraps the text of a successful GET without JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => textResponse("plain", 200)));

    const { GET } = await import("../route");
    const res = await GET(request(url), context("p-1"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ message: "plain" });
  });

  it("wraps a plain text upstream error into a message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => textResponse("gateway down", 503)));

    const { GET } = await import("../route");
    const res = await GET(request(url), context("p-1"));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ message: "gateway down" });
  });

  // Sin texto que envolver, el proxy conserva el status y devuelve null.
  it("propagates the upstream status with a null body when the error body is empty", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => textResponse("", 503)));

    const { PATCH } = await import("../route");
    const res = await PATCH(patchRequest(), context("p-1"));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toBeNull();
  });

  // Una respuesta de éxito sin JSON conserva su status y viaja como `message`.
  it("wraps the text of a successful PATCH into a message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => textResponse("ok", 200)));

    const { PATCH } = await import("../route");
    const res = await PATCH(patchRequest(), context("p-1"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ message: "ok" });
  });

  // Una respuesta de éxito sin JSON conserva su status y viaja como `message`.
  it("wraps the text of a successful DELETE into a message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => textResponse("ok", 200)));

    const { DELETE } = await import("../route");
    const res = await DELETE(
      request(url, { method: "DELETE" }),
      context("p-1")
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ message: "ok" });
  });

  it.each([
    ["GET", "GET"],
    ["PATCH", "PATCH"],
    ["DELETE", "DELETE"],
  ])("normalises an upstream 401 on %s without leaking its body", async (_case, method) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ detail: "expired" }, 401))
    );

    const mod = await import("../route");
    const handler =
      method === "GET" ? mod.GET : method === "PATCH" ? mod.PATCH : mod.DELETE;
    const res = await handler(
      method === "PATCH" ? patchRequest() : request(url, { method }),
      context("p-1")
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ message: "Unauthorized" });
  });
});
