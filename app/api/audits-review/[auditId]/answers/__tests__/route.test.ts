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

/** Contexto de ruta dinámica con el id de auditoría. */
function context(auditId: string) {
  return { params: Promise.resolve({ auditId }) };
}

const url = "http://localhost/api/audits-review/a-1/answers";
const payload = { answers: [{ questionCode: "q1", value: "yes" }] };

/** Petición PUT con el cuerpo JSON esperado por la ruta. */
function putRequest(target = url, body: string = JSON.stringify(payload)) {
  return request(target, {
    method: "PUT",
    body,
    headers: { "content-type": "application/json" },
  });
}

describe("PUT /api/audits-review/[auditId]/answers", () => {
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
    const res = await PUT(putRequest(), context("a-1"));

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the bearer token and the body to the answers endpoint", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ updated: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    const { PUT } = await import("../route");
    const res = await PUT(putRequest(), context("a-1"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ updated: 1 });
    const [upstream, init] = fetchMock.mock.calls[0] as unknown as FetchArgs;
    expect(String(upstream)).toBe(
      "https://api.example.com/api/audits-review/a-1/answers"
    );
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(JSON.stringify(payload));
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer token-abc"
    );
  });

  it("escapes the id before building the upstream url", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    const { PUT } = await import("../route");
    await PUT(putRequest(), context("a/1"));

    const [upstream] = fetchMock.mock.calls[0] as unknown as FetchArgs;
    expect(String(upstream)).toBe(
      "https://api.example.com/api/audits-review/a%2F1/answers"
    );
  });

  it("does not forward query params from the incoming request", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    const { PUT } = await import("../route");
    await PUT(putRequest(`${url}?secret=x`), context("a-1"));

    const [upstream] = fetchMock.mock.calls[0] as unknown as FetchArgs;
    expect(String(upstream)).not.toContain("secret");
  });

  // El cuerpo se valida antes de llamar al backend: un JSON inválido es 400.
  it("rejects an invalid JSON body with 400", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    const { PUT } = await import("../route");
    const res = await PUT(putRequest(url, "no-json"), context("a-1"));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ message: "Invalid JSON body" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(UPSTREAM_ERRORS)(
    "propagates the upstream %i and its body",
    async (status, body) => {
      vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(body, status)));

      const { PUT } = await import("../route");
      const res = await PUT(putRequest(), context("a-1"));

      expect(res.status).toBe(status);
      await expect(res.json()).resolves.toEqual(body);
    }
  );

  it("returns 502 when the backend does not answer", async () => {
    vi.stubGlobal("fetch", failingFetch());

    const { PUT } = await import("../route");
    const res = await PUT(putRequest(), context("a-1"));

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

describe("/api/audits-review/[auditId]/answers with non JSON upstream responses", () => {
  beforeEach(() => {
    vi.resetModules();
    stubEnv();
    cookieStore.value = "token-abc";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("wraps a plain text upstream response into a message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => textResponse("gateway down", 503)));

    const { PUT } = await import("../route");
    const res = await PUT(putRequest(), context("a-1"));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ message: "gateway down" });
  });

  // Un JSON corrupto conserva el status del backend y llega como null.
  it("answers a null body when the JSON is malformed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("{oops", {
            status: 200,
            headers: { "content-type": "application/json" },
          })
      )
    );

    const { PUT } = await import("../route");
    const res = await PUT(putRequest(), context("a-1"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toBeNull();
  });
});
