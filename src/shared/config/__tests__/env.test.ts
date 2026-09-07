// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Because env.ts uses a module-level singleton cache (_publicEnvCache) we must
// re-import the module fresh for each test.  We use vi.resetModules() + dynamic
// import() so every test gets its own copy of the module state.
// ---------------------------------------------------------------------------

/** Minimal valid set of NEXT_PUBLIC_* env vars */
const validPublicVars: Record<string, string> = {
  NEXT_PUBLIC_APP_NAME: "KMA",
  NEXT_PUBLIC_APP_ENV: "development",
  NEXT_PUBLIC_AUTH_BASE_URL: "https://auth.example.com",
  NEXT_PUBLIC_HTTP_TIMEOUT_MS: "5000",
  NEXT_PUBLIC_QUERY_STALE_TIME: "30000",
  NEXT_PUBLIC_API_BASE_URL: "https://api.example.com",
};

/** Minimal valid set of server env vars */
const validServerVars: Record<string, string> = {
  COGNITO_REGION: "us-east-1",
  COGNITO_CLIENT_ID: "client-id-123",
  SESSION_COOKIE_NAME: "session",
  ACCESS_TOKEN_COOKIE_NAME: "access",
  REFRESH_TOKEN_COOKIE_NAME: "refresh",
  COOKIE_SECURE: "true",
  COOKIE_SAMESITE: "Lax",
  HTTP_RETRY_MAX_ATTEMPTS: "3",
  HTTP_RETRY_BASE_DELAY_MS: "200",
};

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// toInt – tested indirectly through publicEnv() which calls toInt on
// NEXT_PUBLIC_HTTP_TIMEOUT_MS and NEXT_PUBLIC_QUERY_STALE_TIME
// ---------------------------------------------------------------------------
describe("toInt (via publicEnv)", () => {
  it("parses a valid integer string", async () => {
    for (const [k, v] of Object.entries(validPublicVars)) {
      vi.stubEnv(k, v);
    }

    const { publicEnv } = await import("../env");
    const env = publicEnv();

    expect(env.httpTimeoutMs).toBe(5000);
    expect(env.queryStaleTimeMs).toBe(30000);
  });

  it("parses string with leading/trailing spaces", async () => {
    for (const [k, v] of Object.entries(validPublicVars)) {
      vi.stubEnv(k, v);
    }
    vi.stubEnv("NEXT_PUBLIC_HTTP_TIMEOUT_MS", "  8000  ");

    const { publicEnv } = await import("../env");
    const env = publicEnv();

    expect(env.httpTimeoutMs).toBe(8000);
  });

  it("throws when the value is not a valid number", async () => {
    for (const [k, v] of Object.entries(validPublicVars)) {
      vi.stubEnv(k, v);
    }
    vi.stubEnv("NEXT_PUBLIC_HTTP_TIMEOUT_MS", "not-a-number");

    const { publicEnv } = await import("../env");

    expect(() => publicEnv()).toThrow("Expected a valid integer number");
  });
});

// ---------------------------------------------------------------------------
// toBool – tested indirectly through serverEnv() which calls toBool on
// COOKIE_SECURE
// ---------------------------------------------------------------------------
describe("toBool (via serverEnv)", () => {
  function stubAllServerVars(overrides: Record<string, string> = {}) {
    // Ensure window is undefined (server context)
    vi.stubGlobal("window", undefined);

    const merged = { ...validPublicVars, ...validServerVars, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      vi.stubEnv(k, v);
    }
  }

  it.each([
    ["true", true],
    ["1", true],
    ["yes", true],
    ["y", true],
    ["false", false],
    ["0", false],
    ["no", false],
    ["n", false],
    ["TRUE", true],
    ["FALSE", false],
    ["Yes", true],
    ["No", false],
  ])('converts "%s" to %s', async (input, expected) => {
    stubAllServerVars({ COOKIE_SECURE: input });

    const { serverEnv } = await import("../env");
    const env = serverEnv();

    expect(env.cookies.secure).toBe(expected);
  });

  it("throws for a non-boolean string", async () => {
    stubAllServerVars({ COOKIE_SECURE: "maybe" });

    const { serverEnv } = await import("../env");

    expect(() => serverEnv()).toThrow("Expected a boolean-like value");
  });
});

// ---------------------------------------------------------------------------
// publicEnv – loading & validation
// ---------------------------------------------------------------------------
describe("publicEnv", () => {
  it("returns a correctly shaped object when all vars are valid", async () => {
    for (const [k, v] of Object.entries(validPublicVars)) {
      vi.stubEnv(k, v);
    }

    const { publicEnv } = await import("../env");
    const env = publicEnv();

    expect(env).toEqual({
      appName: "KMA",
      appEnv: "development",
      authBaseUrl: "https://auth.example.com",
      httpTimeoutMs: 5000,
      queryStaleTimeMs: 30000,
      apiBaseUrl: "https://api.example.com",
      // Polling del reporte: configurable, con valores por defecto.
      reportPoll: { intervalMs: 2000, maxAttempts: 60 },
      locale: "en-US",
    });
  });

  it("caches the result (singleton)", async () => {
    for (const [k, v] of Object.entries(validPublicVars)) {
      vi.stubEnv(k, v);
    }

    const { publicEnv } = await import("../env");

    const first = publicEnv();
    const second = publicEnv();
    expect(first).toBe(second); // reference equality
  });

  it("throws with descriptive message when a required var is missing", async () => {
    // Omit NEXT_PUBLIC_APP_NAME
    const { NEXT_PUBLIC_APP_NAME: _, ...partial } = validPublicVars;
    for (const [k, v] of Object.entries(partial)) {
      vi.stubEnv(k, v);
    }

    const { publicEnv } = await import("../env");

    expect(() => publicEnv()).toThrow("Invalid public environment configuration");
  });

  it("throws when NEXT_PUBLIC_APP_ENV is not a valid enum value", async () => {
    for (const [k, v] of Object.entries(validPublicVars)) {
      vi.stubEnv(k, v);
    }
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "invalid-env");

    const { publicEnv } = await import("../env");

    expect(() => publicEnv()).toThrow("Invalid public environment configuration");
  });

  it("throws when NEXT_PUBLIC_AUTH_BASE_URL is not a valid URL", async () => {
    for (const [k, v] of Object.entries(validPublicVars)) {
      vi.stubEnv(k, v);
    }
    vi.stubEnv("NEXT_PUBLIC_AUTH_BASE_URL", "not-a-url");

    const { publicEnv } = await import("../env");

    expect(() => publicEnv()).toThrow("Invalid public environment configuration");
  });
});

// ---------------------------------------------------------------------------
// serverEnv – loading, validation & client guard
// ---------------------------------------------------------------------------
describe("serverEnv", () => {
  it("throws when called on the client (window is defined)", async () => {
    vi.stubGlobal("window", {});

    const { serverEnv } = await import("../env");

    expect(() => serverEnv()).toThrow("serverEnv() must be called on the server only");
  });

  it("returns correctly shaped object on the server", async () => {
    vi.stubGlobal("window", undefined);
    const allVars = { ...validPublicVars, ...validServerVars };
    for (const [k, v] of Object.entries(allVars)) {
      vi.stubEnv(k, v);
    }

    const { serverEnv } = await import("../env");
    const env = serverEnv();

    expect(env.cognito.region).toBe("us-east-1");
    expect(env.cognito.clientId).toBe("client-id-123");
    expect(env.cookies.sessionName).toBe("session");
    expect(env.cookies.secure).toBe(true);
    expect(env.cookies.sameSite).toBe("Lax");
    expect(env.httpRetry.maxAttempts).toBe(3);
    expect(env.httpRetry.baseDelayMs).toBe(200);
  });

  it("throws with descriptive message when a required server var is missing", async () => {
    vi.stubGlobal("window", undefined);
    // Only set public vars, omit server vars
    for (const [k, v] of Object.entries(validPublicVars)) {
      vi.stubEnv(k, v);
    }

    const { serverEnv } = await import("../env");

    expect(() => serverEnv()).toThrow("Invalid server environment configuration");
  });

  it("throws when COOKIE_SAMESITE has an invalid value", async () => {
    vi.stubGlobal("window", undefined);
    const allVars = {
      ...validPublicVars,
      ...validServerVars,
      COOKIE_SAMESITE: "Invalid",
    };
    for (const [k, v] of Object.entries(allVars)) {
      vi.stubEnv(k, v);
    }

    const { serverEnv } = await import("../env");

    expect(() => serverEnv()).toThrow("Invalid server environment configuration");
  });
});

// ---------------------------------------------------------------------------
// Convenience helpers: isProd, isStaging, isDev
// ---------------------------------------------------------------------------
describe("environment predicates", () => {
  it.each([
    ["production", { isProd: true, isStaging: false, isDev: false }],
    ["staging", { isProd: false, isStaging: true, isDev: false }],
    ["development", { isProd: false, isStaging: false, isDev: true }],
  ] as const)('for appEnv="%s"', async (appEnv, expected) => {
    for (const [k, v] of Object.entries(validPublicVars)) {
      vi.stubEnv(k, v);
    }
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", appEnv);

    const { isProd, isStaging, isDev } = await import("../env");

    expect(isProd()).toBe(expected.isProd);
    expect(isStaging()).toBe(expected.isStaging);
    expect(isDev()).toBe(expected.isDev);
  });
});
