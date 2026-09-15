// ---------------------------------------------------------------------------
// Tests for the session model helper
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { makeSession, type User } from "../sessions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** User de dominio minimo. */
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u-1",
    name: "Jane Doe",
    username: "jane",
    role: "viewer",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// makeSession
// ---------------------------------------------------------------------------

describe("makeSession", () => {
  it("marks the session as authenticated when a user is present", () => {
    const user = makeUser();

    expect(makeSession(user)).toEqual({ user, authenticated: true });
  });

  it("marks the session as anonymous when the user is null", () => {
    expect(makeSession(null)).toEqual({ user: null, authenticated: false });
  });

  it("keeps the same user reference", () => {
    const user = makeUser();

    expect(makeSession(user).user).toBe(user);
  });

  it.each(["administrator", "admin", "auditor", "viewer"] as const)(
    "authenticates a user with the %s role",
    (role) => {
      expect(makeSession(makeUser({ role })).authenticated).toBe(true);
    }
  );
});
