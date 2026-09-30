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

const payload = { name: "Proyecto 1" };

/** Petición POST con el cuerpo JSON esperado por la ruta. */
function postRequest(body: string = JSON.stringify(payload)) {
  return request("http://localhost/api/projects", {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
  });
}

describe("GET /api/projects", () => {
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
    const res = await GET(request("http://localhost/api/projects"));

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the bearer token to the projects endpoint", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("../route");
    const res = await GET(request("http://localhost/api/projects"));

    expect(res.status).toBe(200);
    const [upstream, init] = fetchMock.mock.calls[0] as unknown as FetchArgs;
    expect(String(upstream)).toBe("https://api.example.com/api/projects");
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer token-abc"
    );
  });

  it("forwards only the declared query params and maps sort to snake_case", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("../route");
    await GET(
      request(
        "http://localhost/api/projects?limit=10&cursor=c1&status=active&search=abc&sortBy=name&sortOrder=asc&secret=x"
      )
    );

    const [upstream] = fetchMock.mock.calls[0] as unknown as FetchArgs;
    const params = new URL(String(upstream)).searchParams;
    expect(params.get("limit")).toBe("10");
    expect(params.get("cursor")).toBe("c1");
    expect(params.get("status")).toBe("active");
    expect(params.get("search")).toBe("abc");
    expect(params.get("sort_by")).toBe("name");
    expect(params.get("sort_order")).toBe("asc");
    // Los parámetros no declarados no deben viajar al backend.
    expect(params.has("sortBy")).toBe(false);
    expect(params.has("secret")).toBe(false);
  });

  it.each([
    ["not a number", "abc"],
    ["over the maximum", "201"],
    ["negative", "-3"],
    ["decimal", "1.5"],
  ])("rejects a limit that is %s with 400", async (_case, limit) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("../route");
    const res = await GET(
      request(`http://localhost/api/projects?limit=${limit}`)
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ message: "Invalid limit" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(UPSTREAM_ERRORS)(
    "propagates the upstream %i and its body",
    async (status, body) => {
      vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(body, status)));

      const { GET } = await import("../route");
      const res = await GET(request("http://localhost/api/projects"));

      expect(res.status).toBe(status);
      await expect(res.json()).resolves.toEqual(body);
    }
  );

  it("normalises an upstream 401 without leaking its body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ detail: "expired" }, 401))
    );

    const { GET } = await import("../route");
    const res = await GET(request("http://localhost/api/projects"));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ message: "Unauthorized" });
  });

  it("returns 502 when the backend does not answer", async () => {
    vi.stubGlobal("fetch", failingFetch());

    const { GET } = await import("../route");
    const res = await GET(request("http://localhost/api/projects"));

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({ message: "Bad Gateway" });
  });
});

describe("POST /api/projects", () => {
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

    const { POST } = await import("../route");
    const res = await POST(postRequest());

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the bearer token and the body to the projects endpoint", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "p-1" }, 201));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("../route");
    const res = await POST(postRequest());

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ id: "p-1" });
    const [upstream, init] = fetchMock.mock.calls[0] as unknown as FetchArgs;
    expect(String(upstream)).toBe("https://api.example.com/api/projects");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify(payload));
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer token-abc"
    );
  });

  // El status de éxito ya no se reescribe: viaja tal cual lo manda el backend.
  it("propagates the upstream success status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ id: "p-1" }, 200)));

    const { POST } = await import("../route");
    const res = await POST(postRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ id: "p-1" });
  });

  // El cuerpo se valida antes de llamar al backend: un JSON inválido es 400.
  it("rejects an invalid JSON body with 400", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("../route");
    const res = await POST(postRequest("no-json"));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ message: "Invalid JSON body" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(UPSTREAM_ERRORS)(
    "propagates the upstream %i and its body",
    async (status, body) => {
      vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(body, status)));

      const { POST } = await import("../route");
      const res = await POST(postRequest());

      expect(res.status).toBe(status);
      await expect(res.json()).resolves.toEqual(body);
    }
  );

  it("returns 502 when the backend does not answer", async () => {
    vi.stubGlobal("fetch", failingFetch());

    const { POST } = await import("../route");
    const res = await POST(postRequest());

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({ message: "Bad Gateway" });
  });
});

/** Respuesta del backend sin JSON (por ejemplo un error del gateway). */
function textResponse(body: string, status: number) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain" },
  });
}

describe("/api/projects with non JSON upstream responses", () => {
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
    const res = await GET(request("http://localhost/api/projects"));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ message: "gateway down" });
  });

  // Sin texto que envolver, el proxy conserva el status y devuelve null.
  it("propagates the upstream status with a null body when the error body is empty", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => textResponse("", 503)));

    const { POST } = await import("../route");
    const res = await POST(postRequest());

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toBeNull();
  });

  it("wraps the text of a successful POST without JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => textResponse("created", 200)));

    const { POST } = await import("../route");
    const res = await POST(postRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ message: "created" });
  });

  it("normalises an upstream 401 on POST without leaking its body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ detail: "expired" }, 401))
    );

    const { POST } = await import("../route");
    const res = await POST(postRequest());

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ message: "Unauthorized" });
  });
});
