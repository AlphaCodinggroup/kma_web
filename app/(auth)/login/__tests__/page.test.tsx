/**
 * Página de login (server component): con sesión redirige, sin sesión muestra
 * el formulario.
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = { value: undefined as string | undefined };
const redirect = vi.fn((_url: string) => {
  throw new Error("NEXT_REDIRECT");
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "kma_access" && cookieStore.value
        ? { name, value: cookieStore.value }
        : undefined,
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirect(...(args as [string])),
}));
vi.mock("@features/auth/ui/LoginForm", () => ({
  default: () => null,
}));

/** Declara las variables que zod valida al cargar el entorno del servidor. */
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

describe("LoginPage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    stubEnv();
    cookieStore.value = undefined;
  });

  it("renders the form when there is no session", async () => {
    const { default: Page } = await import("../page");

    await expect(Page({} as never)).resolves.toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects to the dashboard when the access cookie is present", async () => {
    cookieStore.value = "token-abc";
    const { default: Page } = await import("../page");

    await expect(Page({} as never)).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("is always dynamic so the cookie is read on every request", async () => {
    const mod = await import("../page");

    expect(mod.dynamic).toBe("force-dynamic");
    expect(mod.revalidate).toBe(0);
  });
});
