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

  it("keeps an empty name instead of falling back", () => {
    const result = mapUserDTOtoDomain({ name: "", username: "jane" });

    // FIXME: `??` no cubre el string vacio, asi que un name en blanco del
    // backend se muestra como usuario sin nombre en vez de caer a username.
    expect(result.name).toBe("");
  });

  it("maps a null email to null", () => {
    expect(mapUserDTOtoDomain({ email: null }).email).toBeNull();
  });

  it("casts an unknown role without validating it", () => {
    // FIXME: `role` se castea a Role sin comprobar la lista de roles validos;
    // un rol desconocido llega a las guardas de permisos como si fuera valido.
    expect(mapUserDTOtoDomain({ role: "superuser" }).role).toBe("superuser");
  });

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

  it("uses the first cognito group as the role", () => {
    expect(
      mapCognitoClaimsToUser({ "cognito:groups": ["auditor", "admin"] }).role
    ).toBe("auditor");
  });

  it("defaults the role to viewer for an empty groups array", () => {
    expect(mapCognitoClaimsToUser({ "cognito:groups": [] }).role).toBe("viewer");
  });

  it("defaults the role to viewer when groups is not an array", () => {
    expect(
      mapCognitoClaimsToUser({ "cognito:groups": "admin" as never }).role
    ).toBe("viewer");
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

    // FIXME: `exp` se declara en el tipo pero el mapper lo descarta; el dominio
    // no expone la expiracion de la sesion.
    expect(result).not.toHaveProperty("exp");
  });
});
