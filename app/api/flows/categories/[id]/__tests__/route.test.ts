/**
 * Route handler de servidor para /api/flows/categories/[id].
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

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("/api/flows/categories/[id]", () => {
  beforeEach(() => {
    vi.resetModules();
    stubEnv();
    cookieStore.value = "access-token";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rejects empty category id with 400 on GET, PUT, DELETE", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { GET, PUT, DELETE } = await import("../route");

    const getRes = await GET(request("http://localhost/api/flows/categories/"), context("   "));
    const putRes = await PUT(
      request("http://localhost/api/flows/categories/", { method: "PUT", body: "{}" }),
      context(" ")
    );
    const delRes = await DELETE(
      request("http://localhost/api/flows/categories/", { method: "DELETE" }),
      context("")
    );

    expect(getRes.status).toBe(400);
    expect(putRes.status).toBe(400);
    expect(delRes.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("proxies GET /api/flows/categories/:id with encoded segment", async () => {
    const cat = { id: "cat/1", name: "Doors", is_active: true };
    const fetchMock = vi.fn(async () => jsonResponse(cat, 200));
    vi.stubGlobal("fetch", fetchMock);
    const { GET } = await import("../route");

    const res = await GET(request("http://localhost/api/flows/categories/cat%2F1"), context("cat/1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(cat);
    const [calledUrl] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(calledUrl).toBe("https://api.example.com/api/flows/categories/cat%2F1");
  });

  it("proxies PUT /api/flows/categories/:id and validates JSON body", async () => {
    const updated = { id: "cat-1", name: "Updated", is_active: false };
    const fetchMock = vi.fn(async () => jsonResponse(updated, 200));
    vi.stubGlobal("fetch", fetchMock);
    const { PUT } = await import("../route");

    const badRes = await PUT(
      request("http://localhost/api/flows/categories/cat-1", {
        method: "PUT",
        body: "not-json",
      }),
      context("cat-1")
    );
    expect(badRes.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();

    const okRes = await PUT(
      request("http://localhost/api/flows/categories/cat-1", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated", is_active: false }),
        headers: { "content-type": "application/json" },
      }),
      context("cat-1")
    );
    expect(okRes.status).toBe(200);
    expect(await okRes.json()).toEqual(updated);
  });

  it("proxies DELETE /api/flows/categories/:id and forwards permanent query", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const { DELETE } = await import("../route");

    const res = await DELETE(
      request("http://localhost/api/flows/categories/cat-1?permanent=true&extra=1", {
        method: "DELETE",
      }),
      context("cat-1")
    );
    expect(res.status).toBe(204);
    const [calledUrl, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(calledUrl).toBe("https://api.example.com/api/flows/categories/cat-1?permanent=true");
    expect(init.method).toBe("DELETE");
  });
});
