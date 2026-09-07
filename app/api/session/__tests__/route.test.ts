/**
 * Route handler de servidor.
 *
 * @vitest-environment node
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { NextResponse } from "next/server";

/** Cookies leídas por el handler a través de next/headers. */
const cookieStore = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieStore.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));

/** Cognito no se toca en un test unitario: se simula el repositorio. */
const cognito = vi.hoisted(() => ({
  initiateAuthWithPassword: vi.fn(),
  globalSignOut: vi.fn(),
}));

vi.mock("@features/auth/api/cognito.repo.impl", () => cognito);

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

const tokens = {
  accessToken: "access-1",
  idToken: "id-1",
  refreshToken: "refresh-1",
  tokenType: "Bearer",
  expiresInSeconds: 3600,
};

/** Petición de login con el cuerpo JSON esperado por la ruta. */
function loginRequest(body: unknown = { username: "u", password: "p" }) {
  return new Request("http://localhost/api/session", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

/** Nombres de las tres cookies de sesión. */
const COOKIE_NAMES = ["kma_access", "kma_refresh", "kma_session"] as const;

/** Comprueba que las tres cookies de sesión quedaron vacías y expiradas. */
function expectClearedCookies(res: NextResponse) {
  for (const name of COOKIE_NAMES) {
    const cookie = res.cookies.get(name);
    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
  }
}

/** Mapeo de códigos del proveedor a status HTTP. */
const ERROR_STATUSES: Array<[string, number]> = [
  ["UNAUTHORIZED", 401],
  ["NotAuthorizedException", 401],
  ["BAD_REQUEST", 400],
  ["VALIDATION_ERROR", 400],
  ["RATE_LIMITED", 429],
  ["FORBIDDEN", 403],
  ["NOT_FOUND", 404],
  ["SERVER_ERROR", 502],
  ["SOMETHING_ELSE", 400],
];

describe("POST /api/session", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    stubEnv();
    cookieStore.clear();
    cognito.initiateAuthWithPassword.mockResolvedValue(tokens);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("authenticates against the provider with the submitted credentials", async () => {
    const { POST } = await import("../route");
    const res = await POST(loginRequest({ username: "ana", password: "s3cret" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(cognito.initiateAuthWithPassword).toHaveBeenCalledWith(
      "ana",
      "s3cret"
    );
  });

  it("issues the three session cookies", async () => {
    const { POST } = await import("../route");
    const res = await POST(loginRequest());

    const access = res.cookies.get("kma_access");
    const refresh = res.cookies.get("kma_refresh");
    const session = res.cookies.get("kma_session");

    expect(access?.value).toBe("access-1");
    expect(access?.httpOnly).toBe(true);
    expect(access?.maxAge).toBe(3600);
    expect(refresh?.value).toBe("refresh-1");
    expect(refresh?.httpOnly).toBe(true);
    // La marca de sesión es legible por el cliente.
    expect(session?.value).toBe("1");
    expect(session?.httpOnly).toBe(false);
    expect(session?.maxAge).toBe(3600);
  });

  it("does not leak the tokens in the response body", async () => {
    const { POST } = await import("../route");
    const res = await POST(loginRequest());

    const body = await res.text();
    expect(body).not.toContain("access-1");
    expect(body).not.toContain("refresh-1");
    expect(body).not.toContain("id-1");
  });

  it("skips the refresh cookie when the provider does not return one", async () => {
    cognito.initiateAuthWithPassword.mockResolvedValue({
      ...tokens,
      refreshToken: undefined,
    });

    const { POST } = await import("../route");
    const res = await POST(loginRequest());

    expect(res.cookies.get("kma_refresh")).toBeUndefined();
    expect(res.cookies.get("kma_access")?.value).toBe("access-1");
  });

  it.each([
    ["missing password", { username: "u" }],
    ["missing username", { password: "p" }],
    ["empty username", { username: "", password: "p" }],
    ["invalid JSON", "no-json"],
  ])("rejects a body with %s without calling the provider", async (_case, body) => {
    const { POST } = await import("../route");
    const res = await POST(loginRequest(body));

    expect(res.status).toBe(400);
    expect(cognito.initiateAuthWithPassword).not.toHaveBeenCalled();
  });

  it.each(ERROR_STATUSES)(
    "maps the provider code %s to status %i",
    async (code, status) => {
      cognito.initiateAuthWithPassword.mockRejectedValue({
        code,
        message: "provider failed",
      });

      const { POST } = await import("../route");
      const res = await POST(loginRequest());

      expect(res.status).toBe(status);
      await expect(res.json()).resolves.toEqual({
        ok: false,
        code,
        message: "provider failed",
      });
    }
  );

  it("clears the session cookies when the credentials are rejected", async () => {
    cognito.initiateAuthWithPassword.mockRejectedValue({
      code: "NotAuthorizedException",
      message: "Incorrect username or password.",
    });

    const { POST } = await import("../route");
    const res = await POST(loginRequest());

    expect(res.status).toBe(401);
    expectClearedCookies(res);
  });

  it("keeps the cookies untouched on a non authentication failure", async () => {
    cognito.initiateAuthWithPassword.mockRejectedValue({
      code: "RATE_LIMITED",
      message: "Too many requests",
    });

    const { POST } = await import("../route");
    const res = await POST(loginRequest());

    expect(res.status).toBe(429);
    for (const name of COOKIE_NAMES) {
      expect(res.cookies.get(name)).toBeUndefined();
    }
  });
});

describe("DELETE /api/session", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    stubEnv();
    cookieStore.clear();
    cookieStore.set("kma_access", "access-1");
    cognito.globalSignOut.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("signs out on the provider and clears the three cookies", async () => {
    const { DELETE } = await import("../route");
    const res = await DELETE();

    expect(res.status).toBe(204);
    expect(cognito.globalSignOut).toHaveBeenCalledWith("access-1");
    expectClearedCookies(res);
  });

  it("clears the cookies without calling the provider when there is no access token", async () => {
    cookieStore.clear();

    const { DELETE } = await import("../route");
    const res = await DELETE();

    expect(res.status).toBe(204);
    expect(cognito.globalSignOut).not.toHaveBeenCalled();
    expectClearedCookies(res);
  });

  it("clears the cookies even when the provider sign out fails", async () => {
    cognito.globalSignOut.mockRejectedValue(new Error("provider down"));

    const { DELETE } = await import("../route");
    const res = await DELETE();

    expect(res.status).toBe(204);
    expectClearedCookies(res);
  });
});
