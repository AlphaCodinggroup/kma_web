/**
 * Route handler de servidor para /api/flows/categories.
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

describe("GET /api/flows/categories", () => {
  beforeEach(() => {
    vi.resetModules();
    stubEnv();
    cookieStore.value = "access-token";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns 401 when access cookie is missing", async () => {
    cookieStore.value = undefined;
    const { GET } = await import("../route");

    const res = await GET(request("http://localhost/api/flows/categories"));
    expect(res.status).toBe(401);
  });

  it("proxies GET and forwards active/is_active query params only", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ categories: [], total: 0 }, 200)
    );
    vi.stubGlobal("fetch", fetchMock);
    const { GET } = await import("../route");

    const res = await GET(
      request("http://localhost/api/flows/categories?active=true&ignored=foo")
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ categories: [], total: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(calledUrl).toBe("https://api.example.com/api/flows/categories?active=true");
    expect(init.method).toBe("GET");
  });
});

describe("POST /api/flows/categories", () => {
  beforeEach(() => {
    vi.resetModules();
    stubEnv();
    cookieStore.value = "access-token";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns 400 before calling upstream when body is not valid JSON", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("../route");

    const res = await POST(
      request("http://localhost/api/flows/categories", {
        method: "POST",
        body: "{invalid",
        headers: { "content-type": "application/json" },
      })
    );

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("proxies valid JSON body and preserves 201 status", async () => {
    const created = { id: "cat-1", name: "Ramps", description: "", is_active: true };
    const fetchMock = vi.fn(async () => jsonResponse(created, 201));
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("../route");

    const res = await POST(
      request("http://localhost/api/flows/categories", {
        method: "POST",
        body: JSON.stringify({ name: "Ramps" }),
        headers: { "content-type": "application/json" },
      })
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(created);
    const [calledUrl, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(calledUrl).toBe("https://api.example.com/api/flows/categories");
    expect(init.method).toBe("POST");
  });
});
