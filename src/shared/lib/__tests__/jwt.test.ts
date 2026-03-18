// @vitest-environment node
import { describe, it, expect } from "vitest";
import { decodeJwtPayload } from "../jwt";

/**
 * Helper: builds a JWT-shaped string from a plain object payload.
 * Header and signature are dummy values; only the payload segment matters.
 */
function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${header}.${body}.fake-signature`;
}

describe("decodeJwtPayload", () => {
  it("decodes a valid JWT and returns the payload object", () => {
    const payload = { sub: "user-123", email: "a@b.com", iat: 1000 };
    const token = makeJwt(payload);

    const result = decodeJwtPayload(token);

    expect(result).toEqual(payload);
  });

  it("returns typed payload via generic parameter", () => {
    interface CustomClaims {
      sub: string;
      role: string;
    }
    const token = makeJwt({ sub: "u1", role: "admin" });

    const result = decodeJwtPayload<CustomClaims>(token);

    expect(result).not.toBeNull();
    expect(result!.sub).toBe("u1");
    expect(result!.role).toBe("admin");
  });

  it("decodes a JWT with an exp claim in the past (expired token)", () => {
    const expiredPayload = {
      sub: "user-456",
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    };
    const token = makeJwt(expiredPayload);

    // decodeJwtPayload does NOT verify expiration; it should still decode
    const result = decodeJwtPayload(token);

    expect(result).toEqual(expiredPayload);
    expect(result!.exp).toBeLessThan(Math.floor(Date.now() / 1000));
  });

  it("returns null for a malformed token (fewer than 2 segments)", () => {
    expect(decodeJwtPayload("only-one-part")).toBeNull();
  });

  it("returns null for a token whose payload is not valid base64/JSON", () => {
    expect(decodeJwtPayload("header.!!!invalid-base64!!!.sig")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(decodeJwtPayload("")).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(decodeJwtPayload(undefined)).toBeNull();
  });

  it("returns null for null", () => {
    expect(decodeJwtPayload(null)).toBeNull();
  });

  it("returns null when the payload decodes to a JSON array", () => {
    const arrayPayload = btoa(JSON.stringify([1, 2, 3]))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const token = `header.${arrayPayload}.sig`;

    expect(decodeJwtPayload(token)).toBeNull();
  });

  it("returns null when the payload decodes to a JSON primitive", () => {
    const primitivePayload = btoa(JSON.stringify("just a string"))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const token = `header.${primitivePayload}.sig`;

    expect(decodeJwtPayload(token)).toBeNull();
  });
});
