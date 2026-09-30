/**
 * AuthGuard es un Server Component: necesita el entorno node.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

const redirectMock = vi.fn((path: string) => {
  // next/navigation.redirect corta el render lanzando: se replica el contrato.
  throw new Error(`NEXT_REDIRECT:${path}`);
});

vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));

import AuthGuard from "../guard";

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubEnv();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders the children when the access cookie is present", async () => {
    cookieStore.value = "raw.jwt.token";

    const element = await AuthGuard({ children: "private area" });

    expect(redirectMock).not.toHaveBeenCalled();
    expect(element.props.children).toBe("private area");
  });

  it.each([
    ["there is no access cookie", undefined],
    ["the access cookie is empty", ""],
  ])("redirects to /login when %s", async (_label, value) => {
    cookieStore.value = value;

    await expect(AuthGuard({ children: "private area" })).rejects.toThrow(
      "NEXT_REDIRECT:/login"
    );
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});
