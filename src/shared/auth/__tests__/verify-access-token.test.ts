/**
 * Código de servidor: serverEnv() rechaza ejecutarse si existe `window`, así
 * que estos tests corren en entorno node y no en happy-dom.
 *
 * @vitest-environment node
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SignJWT, generateKeyPair, exportJWK } from "jose";

const JWKS_URL = "https://cognito.example.com/pool/.well-known/jwks.json";
const ISSUER = "https://cognito.example.com/pool";

/** Configura el entorno de servidor que lee el verificador. */
function stubServerEnv(overrides: { jwksUrl?: string; issuer?: string; appEnv?: string } = {}) {
  vi.stubEnv("NEXT_PUBLIC_APP_NAME", "KMA");
  vi.stubEnv("NEXT_PUBLIC_APP_ENV", overrides.appEnv ?? "development");
  vi.stubEnv("NEXT_PUBLIC_AUTH_BASE_URL", "https://auth.example.com");
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.com");
  vi.stubEnv("NEXT_PUBLIC_HTTP_TIMEOUT_MS", "5000");
  vi.stubEnv("NEXT_PUBLIC_QUERY_STALE_TIME", "30000");
  vi.stubEnv("COGNITO_REGION", "us-east-2");
  vi.stubEnv("COGNITO_CLIENT_ID", "client");
  vi.stubEnv("SESSION_COOKIE_NAME", "s");
  vi.stubEnv("ACCESS_TOKEN_COOKIE_NAME", "a");
  vi.stubEnv("REFRESH_TOKEN_COOKIE_NAME", "r");
  vi.stubEnv("COOKIE_SECURE", "false");
  vi.stubEnv("COOKIE_SAMESITE", "Lax");
  vi.stubEnv("HTTP_RETRY_MAX_ATTEMPTS", "3");
  vi.stubEnv("HTTP_RETRY_BASE_DELAY_MS", "100");
  if (overrides.jwksUrl !== undefined) vi.stubEnv("COGNITO_JWKS_URL", overrides.jwksUrl);
  if (overrides.issuer !== undefined) vi.stubEnv("COGNITO_ISSUER", overrides.issuer);
}

/** Par de claves y JWKS servido por un fetch simulado. */
async function setupKeys() {
  const { privateKey, publicKey } = await generateKeyPair("RS256", { extractable: true });
  const jwk = await exportJWK(publicKey);
  jwk.kid = "test-kid";
  jwk.alg = "RS256";
  jwk.use = "sig";

  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify({ keys: [jwk] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    )
  );
  return privateKey;
}

async function sign(
  privateKey: CryptoKey,
  claims: Record<string, unknown>,
  opts: { issuer?: string; expiresIn?: string } = {}
) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "test-kid" })
    .setIssuedAt()
    .setIssuer(opts.issuer ?? ISSUER)
    .setExpirationTime(opts.expiresIn ?? "1h")
    .sign(privateKey);
}

describe("verifyAccessToken", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("acepta un token con firma válida", async () => {
    stubServerEnv({ jwksUrl: JWKS_URL, issuer: ISSUER });
    const privateKey = await setupKeys();
    const token = await sign(privateKey, { sub: "user-1", "cognito:groups": ["admin"] });

    const { verifyAccessToken } = await import("../verify-access-token");
    const result = await verifyAccessToken(token);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.verified).toBe(true);
      expect(result.claims.sub).toBe("user-1");
    }
  });

  it("rechaza un token firmado con otra clave", async () => {
    stubServerEnv({ jwksUrl: JWKS_URL, issuer: ISSUER });
    await setupKeys();
    const { privateKey: otherKey } = await generateKeyPair("RS256", { extractable: true });
    const forged = await sign(otherKey, { sub: "attacker", "cognito:groups": ["admin"] });

    const { verifyAccessToken } = await import("../verify-access-token");
    const result = await verifyAccessToken(forged);

    expect(result).toEqual({ ok: false, reason: "invalid-signature" });
  });

  it("rechaza un token expirado", async () => {
    stubServerEnv({ jwksUrl: JWKS_URL, issuer: ISSUER });
    const privateKey = await setupKeys();
    const token = await sign(privateKey, { sub: "user-1" }, { expiresIn: "-1h" });

    const { verifyAccessToken } = await import("../verify-access-token");
    const result = await verifyAccessToken(token);

    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("rechaza un issuer distinto al configurado", async () => {
    stubServerEnv({ jwksUrl: JWKS_URL, issuer: ISSUER });
    const privateKey = await setupKeys();
    const token = await sign(privateKey, { sub: "user-1" }, { issuer: "https://otro.example.com" });

    const { verifyAccessToken } = await import("../verify-access-token");
    const result = await verifyAccessToken(token);

    expect(result).toEqual({ ok: false, reason: "invalid-issuer" });
  });

  it("rechaza cuando no hay token", async () => {
    stubServerEnv({ jwksUrl: JWKS_URL });
    const { verifyAccessToken } = await import("../verify-access-token");
    expect(await verifyAccessToken(undefined)).toEqual({ ok: false, reason: "missing-token" });
    expect(await verifyAccessToken("")).toEqual({ ok: false, reason: "missing-token" });
  });

  it("falla cerrado en producción si no hay JWKS configurado", async () => {
    stubServerEnv({ appEnv: "production" });
    const { verifyAccessToken } = await import("../verify-access-token");

    const result = await verifyAccessToken("cualquier.token.aca");

    expect(result).toEqual({ ok: false, reason: "not-configured" });
  });

  it("fuera de producción sin JWKS decodifica pero marca verified=false", async () => {
    stubServerEnv({ appEnv: "development" });
    const payload = Buffer.from(
      JSON.stringify({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600 })
    ).toString("base64url");
    const token = `header.${payload}.signature`;

    const { verifyAccessToken } = await import("../verify-access-token");
    const result = await verifyAccessToken(token);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.verified).toBe(false);
      expect(result.claims.sub).toBe("user-1");
    }
  });
});

describe("groupsOf", () => {
  it("interpreta los formatos de grupos que produce Cognito", async () => {
    const { groupsOf } = await import("../verify-access-token");

    expect(groupsOf({ "cognito:groups": ["admin", "qc"] })).toEqual(["admin", "qc"]);
    expect(groupsOf({ "cognito:groups": "[admin qc]" } as never)).toEqual(["admin", "qc"]);
    expect(groupsOf({ "cognito:groups": "admin,qc" } as never)).toEqual(["admin", "qc"]);
    expect(groupsOf({})).toEqual([]);
    expect(groupsOf({ "cognito:groups": "" } as never)).toEqual([]);
  });
});
