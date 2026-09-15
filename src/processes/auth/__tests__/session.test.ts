/**
 * getServerSession corre en el servidor: necesita el entorno node.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { VerificationResult } from "@shared/auth/verify-access-token";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const cookieStore = { value: undefined as string | undefined };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "kma_access" && cookieStore.value
        ? { name, value: cookieStore.value }
        : undefined,
  }),
}));

const verifyAccessTokenMock = vi.fn();

vi.mock("@shared/auth/verify-access-token", () => ({
  verifyAccessToken: (...args: unknown[]) => verifyAccessTokenMock(...args),
}));

import { getServerSession } from "../session";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Resultado de verificación exitosa con los claims indicados. */
function verified(claims: unknown): VerificationResult {
  return {
    ok: true,
    claims: claims as never,
    verified: true,
  } as VerificationResult;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getServerSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubEnv();
    cookieStore.value = "raw.jwt.token";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ---- Sesión ausente ----------------------------------------------------

  it("returns an unauthenticated session when the cookie is missing", async () => {
    cookieStore.value = undefined;

    await expect(getServerSession()).resolves.toEqual({
      user: null,
      authenticated: false,
    });
    expect(verifyAccessTokenMock).not.toHaveBeenCalled();
  });

  it.each<[string, VerificationResult]>([
    ["the signature is invalid", { ok: false, reason: "invalid-signature" }],
    ["the token expired", { ok: false, reason: "expired" }],
    ["the issuer does not match", { ok: false, reason: "invalid-issuer" }],
    ["the pool is not configured", { ok: false, reason: "not-configured" }],
  ])("returns an unauthenticated session when %s", async (_label, result) => {
    verifyAccessTokenMock.mockResolvedValue(result);

    await expect(getServerSession()).resolves.toEqual({
      user: null,
      authenticated: false,
    });
    expect(verifyAccessTokenMock).toHaveBeenCalledWith("raw.jwt.token");
  });

  it("returns an unauthenticated session when the claims cannot be mapped", async () => {
    verifyAccessTokenMock.mockResolvedValue(verified(null));

    await expect(getServerSession()).resolves.toEqual({
      user: null,
      authenticated: false,
    });
  });

  // ---- Derivación de rol -------------------------------------------------

  it("maps the verified claims to an authenticated user", async () => {
    verifyAccessTokenMock.mockResolvedValue(
      verified({
        sub: "cognito-1",
        username: "jane",
        name: "Jane Doe",
        email: "jane@test.com",
        "cognito:groups": ["admin"],
      })
    );

    await expect(getServerSession()).resolves.toEqual({
      authenticated: true,
      user: {
        id: "cognito-1",
        name: "Jane Doe",
        username: "jane",
        email: "jane@test.com",
        role: "admin",
        avatarUrl: null,
        lastLoginAt: null,
      },
    });
  });

  it.each([
    ["administrator", ["administrator"], "administrator"],
    ["admin", ["admin"], "admin"],
    ["auditor", ["auditor"], "auditor"],
    ["the first group when there are several", ["auditor", "qc"], "auditor"],
  ])("derives the role from %s", async (_label, groups, expected) => {
    verifyAccessTokenMock.mockResolvedValue(
      verified({ sub: "cognito-1", username: "jane", "cognito:groups": groups })
    );

    const session = await getServerSession();

    expect(session.user?.role).toBe(expected);
  });

  it("falls back to viewer when the token carries no group claim", async () => {
    verifyAccessTokenMock.mockResolvedValue(
      verified({ sub: "cognito-1", username: "jane" })
    );

    const session = await getServerSession();

    expect(session.user?.role).toBe("viewer");
    expect(session.authenticated).toBe(true);
  });

  it("falls back to viewer when the group claim is an empty array", async () => {
    verifyAccessTokenMock.mockResolvedValue(
      verified({ sub: "cognito-1", username: "jane", "cognito:groups": [] })
    );

    expect((await getServerSession()).user?.role).toBe("viewer");
  });

  // API Gateway serializa cognito:groups como "[admin qc]". Leerlo sólo como
  // array dejaba a un administrador con rol "viewer" y sin acceso a las
  // pantallas de administración.
  it.each([
    ["a single group", "[admin]", "admin"],
    ["several groups", "[admin qc]", "admin"],
    ["a group that is not a domain role", "[qc]", "qc"],
  ])(
    "reads the role when API Gateway serializes %s as a string",
    async (_label, raw, expected) => {
      verifyAccessTokenMock.mockResolvedValue(
        verified({ sub: "cognito-1", username: "jane", "cognito:groups": raw })
      );

      const session = await getServerSession();

      expect(session.user?.role).toBe(expected);
      expect(session.authenticated).toBe(true);
    }
  );

  // ---- Defaults del mapper -----------------------------------------------

  it("falls back to the sub as username and to unknown as id", async () => {
    verifyAccessTokenMock.mockResolvedValue(verified({ sub: "cognito-1" }));

    const session = await getServerSession();

    expect(session.user).toMatchObject({
      id: "cognito-1",
      username: "cognito-1",
      name: "cognito-1",
      email: null,
    });
  });

  it("uses generic defaults when the token has no identity claims", async () => {
    verifyAccessTokenMock.mockResolvedValue(verified({}));

    const session = await getServerSession();

    expect(session.user).toMatchObject({
      id: "unknown",
      username: "user",
      name: "user",
      role: "viewer",
    });
  });
});
