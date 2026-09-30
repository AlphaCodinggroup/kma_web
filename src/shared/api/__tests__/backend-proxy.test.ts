/**
 * El proxy corre en el servidor (usa next/headers y serverEnv).
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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function request(url: string, init?: RequestInit) {
  return new NextRequest(new Request(url, init));
}

describe("proxyToBackend", () => {
  beforeEach(() => {
    vi.resetModules();
    stubEnv();
    cookieStore.value = "token-abc";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("responde 401 sin cookie de sesión y no llama al backend", async () => {
    cookieStore.value = undefined;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { proxyToBackend } = await import("../backend-proxy");
    const res = await proxyToBackend(request("http://localhost/api/audits"), {
      path: "/audits",
    });

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reenvía el token y la ruta al backend", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ audits: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const { proxyToBackend } = await import("../backend-proxy");
    const res = await proxyToBackend(request("http://localhost/api/audits"), {
      path: "/audits",
    });

    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.example.com/api/audits");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token-abc");
  });

  it("propaga sólo los query params declarados", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ audits: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const { proxyToBackend } = await import("../backend-proxy");
    await proxyToBackend(
      request("http://localhost/api/audits?status=completed&secreto=x&limit="),
      { path: "/audits", forwardQuery: ["status", "limit"] }
    );

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain("status=completed");
    expect(url).not.toContain("secreto");
    expect(url).not.toContain("limit=");
  });

  it("propaga el status y el cuerpo de error del backend", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ code: "AUDIT_NOT_FOUND" }, 404)));

    const { proxyToBackend } = await import("../backend-proxy");
    const res = await proxyToBackend(request("http://localhost/api/audits/x"), {
      path: "/audits/x",
    });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ code: "AUDIT_NOT_FOUND" });
  });

  it("convierte un 401 del backend en 401 uniforme", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ message: "nope" }, 401)));

    const { proxyToBackend } = await import("../backend-proxy");
    const res = await proxyToBackend(request("http://localhost/api/audits"), {
      path: "/audits",
    });

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ message: "Unauthorized" });
  });

  it("responde 502 si el backend no contesta", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }));

    const { proxyToBackend } = await import("../backend-proxy");
    const res = await proxyToBackend(request("http://localhost/api/audits"), {
      path: "/audits",
    });

    expect(res.status).toBe(502);
  });

  it("reenvía el cuerpo en métodos de escritura", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "c-1" }, 201));
    vi.stubGlobal("fetch", fetchMock);

    const { proxyToBackend } = await import("../backend-proxy");
    const res = await proxyToBackend(
      request("http://localhost/api/comments", {
        method: "POST",
        body: JSON.stringify({ content: "hola" }),
        headers: { "content-type": "application/json" },
      }),
      { path: "/comments" }
    );

    expect(res.status).toBe(201);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ content: "hola" }));
  });

  it("omite el cuerpo cuando se pide explícitamente", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const { proxyToBackend } = await import("../backend-proxy");
    await proxyToBackend(
      request("http://localhost/api/facilities/1/restore", { method: "POST" }),
      { method: "POST", path: "/facilities/1/restore", omitBody: true }
    );

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.body).toBeUndefined();
  });

  it("devuelve 204 sin cuerpo", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));

    const { proxyToBackend } = await import("../backend-proxy");
    const res = await proxyToBackend(
      request("http://localhost/api/audits/x", { method: "DELETE" }),
      { path: "/audits/x" }
    );

    expect(res.status).toBe(204);
  });
});
