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

function stubEnv(allowedHosts?: string) {
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
  if (allowedHosts !== undefined) {
    vi.stubEnv("UPLOAD_PROXY_ALLOWED_HOSTS", allowedHosts);
  }
}

/** Arma la petición al proxy con la URL destino codificada en base64. */
function proxyRequest(targetUrl: string) {
  const encoded = Buffer.from(targetUrl, "utf8").toString("base64");
  return new NextRequest(
    new Request(`http://localhost/api/uploads/proxy?url=${encodeURIComponent(encoded)}`, {
      method: "PUT",
      body: "contenido",
      headers: { "content-type": "image/jpeg" },
    })
  );
}

describe("PUT /api/uploads/proxy", () => {
  beforeEach(() => {
    vi.resetModules();
    stubEnv("storage.example.com");
    cookieStore.value = "token-abc";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("responde 401 sin sesión", async () => {
    cookieStore.value = undefined;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { PUT } = await import("../route");
    const res = await PUT(proxyRequest("https://storage.example.com/bucket/key"));

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reenvía a un host permitido", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { PUT } = await import("../route");
    const res = await PUT(proxyRequest("https://storage.example.com/bucket/key?sig=x"));

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("acepta el host del backend sin configurarlo aparte", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { PUT } = await import("../route");
    const res = await PUT(proxyRequest("https://api.example.com/upload"));

    expect(res.status).toBe(200);
  });

  // El defecto original: cualquier URL era aceptada.
  it.each([
    ["host interno", "http://169.254.169.254/latest/meta-data/"],
    ["localhost", "http://localhost:9200/_cluster/health"],
    ["IP privada", "http://10.0.0.5/admin"],
    ["host arbitrario", "https://evil.example.net/steal"],
    ["esquema file", "file:///etc/passwd"],
    ["credenciales embebidas", "https://user:pass@storage.example.com/x"],
  ])("rechaza %s", async (_caso, target) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { PUT } = await import("../route");
    const res = await PUT(proxyRequest(target));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rechaza un subdominio parecido pero distinto", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { PUT } = await import("../route");
    const res = await PUT(proxyRequest("https://storage.example.com.evil.net/x"));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("acepta un subdominio real del host permitido", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { PUT } = await import("../route");
    const res = await PUT(proxyRequest("https://eu.storage.example.com/x"));

    expect(res.status).toBe(200);
  });

  it("responde 400 si falta la url", async () => {
    const { PUT } = await import("../route");
    const res = await PUT(
      new NextRequest(new Request("http://localhost/api/uploads/proxy", { method: "PUT" }))
    );
    expect(res.status).toBe(400);
  });

  it("propaga el error del almacenamiento", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("AccessDenied", { status: 403 })));

    const { PUT } = await import("../route");
    const res = await PUT(proxyRequest("https://storage.example.com/bucket/key"));

    expect(res.status).toBe(403);
  });
});
