// ---------------------------------------------------------------------------
// Tests for the user/session mappers
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
  mapUserDTOtoDomain,
  mapCognitoClaimsToUser,
  type CognitoAccessTokenClaims,
} from "../mappers";

// ---------------------------------------------------------------------------
// mapUserDTOtoDomain
// ---------------------------------------------------------------------------

describe("mapUserDTOtoDomain", () => {
  it("maps a complete DTO", () => {
    expect(
      mapUserDTOtoDomain({
        id: "u-1",
        name: "Jane Doe",
        username: "jane",
        email: "jane@example.com",
        role: "auditor",
        avatarUrl: "https://cdn/avatar.png",
        lastLoginAt: "2026-01-01T00:00:00Z",
      })
    ).toEqual({
      id: "u-1",
      name: "Jane Doe",
      username: "jane",
      email: "jane@example.com",
      role: "auditor",
      avatarUrl: "https://cdn/avatar.png",
      lastLoginAt: "2026-01-01T00:00:00Z",
    });
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["an empty object", {}],
  ])("returns the fully defaulted user for %s", (_label, input) => {
    expect(mapUserDTOtoDomain(input)).toEqual({
      id: "unknown",
      name: "User",
      username: "user",
      email: null,
      role: "viewer",
      avatarUrl: null,
      lastLoginAt: null,
    });
  });

  it("stringifies a numeric id", () => {
    expect(mapUserDTOtoDomain({ id: 42 }).id).toBe("42");
  });

  it("stringifies the numeric id 0 instead of treating it as absent", () => {
    expect(mapUserDTOtoDomain({ id: 0 }).id).toBe("0");
  });

  it("falls back to unknown when the id is null", () => {
    expect(mapUserDTOtoDomain({ id: null }).id).toBe("unknown");
  });

  it("uses username as the fallback for name", () => {
    expect(mapUserDTOtoDomain({ username: "jane" }).name).toBe("jane");
  });

  it("uses name as the fallback for username", () => {
    expect(mapUserDTOtoDomain({ name: "Jane Doe" }).username).toBe("Jane Doe");
  });

  // Un name en blanco cae al username: `??` no cubría el string vacío y el
  // usuario se mostraba sin nombre.
  it.each([
    ["an empty name", ""],
    ["a blank name", "   "],
  ])("falls back to the username for %s", (_label, name) => {
    const result = mapUserDTOtoDomain({ name, username: "jane" });

    expect(result.name).toBe("jane");
  });

  it("maps a null email to null", () => {
    expect(mapUserDTOtoDomain({ email: null }).email).toBeNull();
  });

  // Un rol desconocido cae a "viewer": antes se casteaba tal cual y llegaba a
  // las guardas de permisos como si fuera válido.
  it.each([
    ["an unknown role", "superuser"],
    ["an empty role", ""],
  ])("falls back to viewer for %s", (_label, role) => {
    expect(mapUserDTOtoDomain({ role }).role).toBe("viewer");
  });

  it.each(["administrator", "admin", "auditor", "viewer"] as const)(
    "keeps the known role %s",
    (role) => {
      expect(mapUserDTOtoDomain({ role }).role).toBe(role);
    }
  );

  it("defaults the role to viewer when it is null", () => {
    expect(mapUserDTOtoDomain({ role: null }).role).toBe("viewer");
  });
});

// ---------------------------------------------------------------------------
// mapCognitoClaimsToUser
// ---------------------------------------------------------------------------

describe("mapCognitoClaimsToUser", () => {
  it("maps a complete claims object", () => {
    const claims: CognitoAccessTokenClaims = {
      sub: "cognito-sub",
      username: "jane",
      email: "jane@example.com",
      name: "Jane Doe",
      "cognito:groups": ["admin", "auditor"],
      exp: 1893456000,
    };

    expect(mapCognitoClaimsToUser(claims)).toEqual({
      id: "cognito-sub",
      name: "Jane Doe",
      username: "jane",
      email: "jane@example.com",
      role: "admin",
      avatarUrl: null,
      lastLoginAt: null,
    });
  });

  it("returns the fully defaulted user for empty claims", () => {
    expect(mapCognitoClaimsToUser({})).toEqual({
      id: "unknown",
      name: "user",
      username: "user",
      email: null,
      role: "viewer",
      avatarUrl: null,
      lastLoginAt: null,
    });
  });

  // Gana el grupo más privilegiado, no el primero: el orden en que Cognito
  // devuelve los grupos no está garantizado.
  it("uses the most privileged cognito group as the role", () => {
    expect(
      mapCognitoClaimsToUser({ "cognito:groups": ["auditor", "admin"] }).role
    ).toBe("admin");
  });

  // Un grupo que no es un rol de dominio se respeta tal cual.
  it("keeps a group that is not a domain role", () => {
    expect(
      mapCognitoClaimsToUser({ "cognito:groups": ["qc"] }).role
    ).toBe("qc");
  });

  it("defaults the role to viewer for an empty groups array", () => {
    expect(mapCognitoClaimsToUser({ "cognito:groups": [] }).role).toBe("viewer");
  });

  // API Gateway serializa el claim como "[admin qc]": leerlo sólo como array
  // degradaba al usuario a "viewer" y le quitaba el acceso de administración.
  it.each([
    ["admin", "admin"],
    ["[admin]", "admin"],
    ["[qc admin]", "admin"],
    ["[qc]", "qc"],
    ["", "viewer"],
  ])("reads the group serialized as the string %s", (raw, expected) => {
    expect(
      mapCognitoClaimsToUser({ "cognito:groups": raw as never }).role
    ).toBe(expected);
  });

  it("falls back to sub for the username", () => {
    const result = mapCognitoClaimsToUser({ sub: "sub-123" });

    expect(result.username).toBe("sub-123");
    expect(result.name).toBe("sub-123");
  });

  it("falls back to user when username is an empty string", () => {
    expect(mapCognitoClaimsToUser({ username: "" }).username).toBe("user");
  });

  it("uses the username as the name when the name claim is empty", () => {
    expect(mapCognitoClaimsToUser({ username: "jane", name: "" }).name).toBe(
      "jane"
    );
  });

  it("always nulls avatarUrl and lastLoginAt", () => {
    const result = mapCognitoClaimsToUser({ sub: "s", username: "u" });

    expect(result.avatarUrl).toBeNull();
    expect(result.lastLoginAt).toBeNull();
  });

  it("ignores the exp claim", () => {
    const result = mapCognitoClaimsToUser({ sub: "s", exp: 1893456000 });

    // El dominio no expone `exp` a propósito: la expiración se comprueba en
    // shared/auth/verify-access-token, sobre los claims ya verificados y antes
    // de mapear. El campo está en el tipo de claims porque el token lo trae.
    expect(result).not.toHaveProperty("exp");
  });
});
