import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createRemoteJWKSet: vi.fn(() => "jwks"),
  jwtVerify: vi.fn(),
  serverEnv: vi.fn(),
}));

vi.mock("jose", () => ({
  createRemoteJWKSet: mocks.createRemoteJWKSet,
  jwtVerify: mocks.jwtVerify,
}));
vi.mock("@shared/config/env", () => ({ serverEnv: mocks.serverEnv }));

import { verifyAccessToken } from "./verify-access-token";

describe("verifyAccessToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.serverEnv.mockReturnValue({
      cognito: {
        jwksUrl: "https://issuer.example/.well-known/jwks.json",
        issuer: "https://issuer.example",
        clientId: "client-1",
      },
    });
    mocks.jwtVerify.mockResolvedValue({
      payload: {
        sub: "user-1",
        exp: 2,
        iat: 1,
        token_use: "access",
        client_id: "client-1",
        "cognito:groups": ["Admin"],
      },
    });
  });

  it("verifies issuer, signature claims, purpose, client and groups", async () => {
    const claims = await verifyAccessToken("token", ["admin"]);
    expect(claims.sub).toBe("user-1");
    expect(mocks.jwtVerify).toHaveBeenCalledWith(
      "token",
      "jwks",
      expect.objectContaining({ issuer: "https://issuer.example", algorithms: ["RS256"] })
    );
  });

  it("rejects missing verifier configuration", async () => {
    mocks.serverEnv.mockReturnValueOnce({ cognito: { clientId: "client-1" } });
    await expect(verifyAccessToken("token")).rejects.toThrow("not configured");
  });

  it.each([
    [{ token_use: "id", client_id: "client-1" }, "purpose"],
    [{ token_use: "access", client_id: "other" }, "purpose"],
    [{ token_use: "access", client_id: "client-1", "cognito:groups": ["viewer"] }, "Forbidden"],
    [{ token_use: "access", client_id: "client-1", "cognito:groups": "admin" }, "Forbidden"],
  ])("rejects invalid claims %#o", async (payload, message) => {
    mocks.jwtVerify.mockResolvedValueOnce({ payload });
    await expect(verifyAccessToken("token", ["admin"])).rejects.toThrow(message);
  });
});
