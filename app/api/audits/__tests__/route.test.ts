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

describe("GET /api/audits", () => {
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
    const res = await GET(request("http://localhost/api/audits"));

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the bearer token to the audits endpoint", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ audits: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("../route");
    const res = await GET(request("http://localhost/api/audits"));

    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as unknown as FetchArgs;
    expect(String(url)).toBe("https://api.example.com/api/audits");
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer token-abc"
    );
  });

  it("forwards only the declared query params", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ audits: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("../route");
    await GET(
      request(
        "http://localhost/api/audits?status=completed&auditor=u-1&limit=50&last_eval_id=k1&secret=x&sortBy=name"
      )
    );

    const [url] = fetchMock.mock.calls[0] as unknown as FetchArgs;
    const params = new URL(String(url)).searchParams;
    expect(params.get("status")).toBe("completed");
    expect(params.get("auditor")).toBe("u-1");
    expect(params.get("limit")).toBe("50");
    expect(params.get("last_eval_id")).toBe("k1");
    // Los parámetros no declarados no deben viajar al backend.
    expect(params.has("secret")).toBe(false);
    expect(params.has("sortBy")).toBe(false);
  });

  it.each([
    ["not a number", "abc"],
    ["over the maximum", "201"],
    ["negative", "-3"],
    ["decimal", "1.5"],
    ["scientific notation", "1e3"],
  ])("rejects a limit that is %s with 400", async (_case, limit) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("../route");
    const res = await GET(request(`http://localhost/api/audits?limit=${limit}`));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ message: "Invalid limit" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts the maximum allowed limit", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ audits: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("../route");
    const res = await GET(request("http://localhost/api/audits?limit=200"));

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each(UPSTREAM_ERRORS)(
    "propagates the upstream %i and its body",
    async (status, body) => {
      vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(body, status)));

      const { GET } = await import("../route");
      const res = await GET(request("http://localhost/api/audits"));

      expect(res.status).toBe(status);
      await expect(res.json()).resolves.toEqual(body);
    }
  );

  it("normalises an upstream 401 without leaking its body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ detail: "expired token" }, 401))
    );

    const { GET } = await import("../route");
    const res = await GET(request("http://localhost/api/audits"));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ message: "Unauthorized" });
  });

  it("returns 502 when the backend does not answer", async () => {
    vi.stubGlobal("fetch", failingFetch());

    const { GET } = await import("../route");
    const res = await GET(request("http://localhost/api/audits"));

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({ message: "Bad Gateway" });
  });
});
