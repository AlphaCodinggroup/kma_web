/**
 * Route handler de servidor.
 *
 * @vitest-environment node
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

type CookieOptions = { maxAge?: number; httpOnly?: boolean };
type StoredCookie = { value: string; options: CookieOptions };

/** Jar simulado de next/headers: la ruta lee y escribe cookies por acá. */
const cookieStore = new Map<string, StoredCookie>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const cookie = cookieStore.get(name);
      return cookie === undefined ? undefined : { name, value: cookie.value };
    },
    set: (name: string, value: string, options: CookieOptions = {}) => {
      cookieStore.set(name, { value, options });
    },
  }),
}));

/** Cognito no se toca en un test unitario: se simula el repositorio. */
const cognito = vi.hoisted(() => ({
  initiateAuthWithRefreshToken: vi.fn(),
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
  accessToken: "access-2",
  idToken: "id-2",
  refreshToken: "refresh-2",
  tokenType: "Bearer",
  expiresInSeconds: 3600,
};

/** Nombres de las tres cookies de sesión. */
const COOKIE_NAMES = ["kma_access", "kma_refresh", "kma_session"] as const;

/** Comprueba que las tres cookies de sesión quedaron vacías y expiradas. */
function expectClearedCookies() {
  for (const name of COOKIE_NAMES) {
    expect(cookieStore.get(name)?.value).toBe("");
    expect(cookieStore.get(name)?.options.maxAge).toBe(0);
  }
}

/** Deja el jar con una sesión válida. */
function seedSession() {
  cookieStore.set("kma_access", { value: "access-1", options: {} });
  cookieStore.set("kma_refresh", { value: "refresh-1", options: {} });
  cookieStore.set("kma_session", { value: "1", options: {} });
}

describe("POST /api/session/refresh", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    stubEnv();
    cookieStore.clear();
    seedSession();
    cognito.initiateAuthWithRefreshToken.mockResolvedValue(tokens);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("exchanges the refresh cookie for a new access token", async () => {
    const { POST } = await import("../route");
    const res = await POST();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(cognito.initiateAuthWithRefreshToken).toHaveBeenCalledWith(
      "refresh-1"
    );
  });

  it("refreshes the three session cookies", async () => {
    const { POST } = await import("../route");
    await POST();

    expect(cookieStore.get("kma_access")).toEqual({
      value: "access-2",
      options: expect.objectContaining({ httpOnly: true, maxAge: 3600 }),
    });
    expect(cookieStore.get("kma_refresh")?.value).toBe("refresh-2");
    // La marca de sesión es legible por el cliente.
    expect(cookieStore.get("kma_session")).toEqual({
      value: "1",
      options: expect.objectContaining({ httpOnly: false, maxAge: 3600 }),
    });
  });

  it("keeps the previous refresh cookie when the provider does not rotate it", async () => {
    cognito.initiateAuthWithRefreshToken.mockResolvedValue({
      ...tokens,
      refreshToken: undefined,
    });

    const { POST } = await import("../route");
    const res = await POST();

    expect(res.status).toBe(200);
    expect(cookieStore.get("kma_refresh")?.value).toBe("refresh-1");
    expect(cookieStore.get("kma_access")?.value).toBe("access-2");
  });

  it("does not leak the tokens in the response body", async () => {
    const { POST } = await import("../route");
    const res = await POST();

    const body = await res.text();
    expect(body).not.toContain("access-2");
    expect(body).not.toContain("refresh-2");
  });

  it("answers 401 and clears the cookies when the refresh cookie is missing", async () => {
    cookieStore.delete("kma_refresh");

    const { POST } = await import("../route");
    const res = await POST();

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      code: "UNAUTHORIZED",
      message: "Missing refresh token.",
    });
    expect(cognito.initiateAuthWithRefreshToken).not.toHaveBeenCalled();
    expectClearedCookies();
  });

  it.each([
    ["UNAUTHORIZED"],
    ["NotAuthorizedException"],
    ["FORBIDDEN"],
  ])("answers 401 and clears the cookies on the provider code %s", async (code) => {
    cognito.initiateAuthWithRefreshToken.mockRejectedValue({
      code,
      message: "Refresh Token has expired",
    });

    const { POST } = await import("../route");
    const res = await POST();

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      code,
      message: "Refresh Token has expired",
    });
    expectClearedCookies();
  });

  it.each([
    ["RATE_LIMITED", 429],
    ["BAD_REQUEST", 400],
    ["VALIDATION_ERROR", 400],
    ["NOT_FOUND", 404],
    ["SERVER_ERROR", 502],
    ["SOMETHING_ELSE", 400],
  ])(
    "maps the provider code %s to status %i without clearing the cookies",
    async (code, status) => {
      cognito.initiateAuthWithRefreshToken.mockRejectedValue({
        code,
        message: "provider failed",
      });

      const { POST } = await import("../route");
      const res = await POST();

      expect(res.status).toBe(status);
      await expect(res.json()).resolves.toEqual({
        ok: false,
        code,
        message: "provider failed",
      });
      expect(cookieStore.get("kma_refresh")?.value).toBe("refresh-1");
      expect(cookieStore.get("kma_access")?.value).toBe("access-1");
    }
  );

  it("falls back to a generic code and message when the provider throws a bare error", async () => {
    cognito.initiateAuthWithRefreshToken.mockRejectedValue(new Error("boom"));

    const { POST } = await import("../route");
    const res = await POST();

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      code: "UNKNOWN_ERROR",
      message: "boom",
    });
  });
});
