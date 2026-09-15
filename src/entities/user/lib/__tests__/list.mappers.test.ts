// ---------------------------------------------------------------------------
// Tests for the users list mappers (GET /users)
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { mapUserFromDTO, mapUsersListFromDTO, type UserDTO } from "../list.mappers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** UserDTO minimo del listado. */
function makeUserDTO(overrides: Partial<UserDTO> = {}): UserDTO {
  return {
    id: "u-1",
    name: "Jane Doe",
    email: "jane@example.com",
    role: "auditor",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// mapUserFromDTO
// ---------------------------------------------------------------------------

describe("mapUserFromDTO", () => {
  it("maps cognito_id to cognitoId", () => {
    expect(mapUserFromDTO(makeUserDTO({ cognito_id: "cog-1" }))).toEqual({
      id: "u-1",
      cognitoId: "cog-1",
      name: "Jane Doe",
      email: "jane@example.com",
      role: "auditor",
    });
  });

  it("defaults cognitoId to an empty string when absent", () => {
    expect(mapUserFromDTO(makeUserDTO()).cognitoId).toBe("");
  });

  it("keeps empty strings for name, email and role", () => {
    const result = mapUserFromDTO(makeUserDTO({ name: "", email: "", role: "" }));

    // Los campos obligatorios se normalizan a cadena: un usuario sin rol ni
  // nombre ya no entra al dominio con undefined.
    expect(result.name).toBe("");
    expect(result.email).toBe("");
    expect(result.role).toBe("");
  });
});

// ---------------------------------------------------------------------------
// mapUsersListFromDTO
// ---------------------------------------------------------------------------

describe("mapUsersListFromDTO", () => {
  it("maps every user of the list", () => {
    const result = mapUsersListFromDTO([
      makeUserDTO({ id: "u-1" }),
      makeUserDTO({ id: "u-2", cognito_id: "cog-2" }),
    ]);

    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.cognitoId).toBe("");
    expect(result.items[1]?.cognitoId).toBe("cog-2");
  });

  it("returns an empty list for an empty array", () => {
    expect(mapUsersListFromDTO([])).toEqual({ items: [] });
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["an object", { items: [] }],
    ["a string", "nope"],
  ])("returns an empty list when the response is %s", (_label, input) => {
    expect(mapUsersListFromDTO(input as never)).toEqual({ items: [] });
  });
});
