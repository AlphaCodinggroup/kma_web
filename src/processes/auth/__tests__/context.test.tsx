// ---------------------------------------------------------------------------
// Tests for the auth context (AuthProvider + useSession)
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import type { Role, Session, User } from "@entities/user/model/sessions";
import { AuthProvider, useSession } from "../context";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "cognito-1",
    name: "Jane Doe",
    username: "jane",
    email: "jane@test.com",
    role: "viewer",
    avatarUrl: null,
    lastLoginAt: null,
    ...overrides,
  };
}

function makeSession(user: User | null): Session {
  return { user, authenticated: Boolean(user) };
}

/** Wrapper que envuelve el hook con el provider y la sesión indicada. */
function wrapperFor(session: Session) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <AuthProvider session={session}>{children}</AuthProvider>;
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useSession", () => {
  it("throws when it is used outside of the provider", () => {
    expect(() => renderHook(() => useSession())).toThrow(
      "useSession must be used within an AuthProvider"
    );
  });

  it("exposes the session and the user", () => {
    const user = makeUser();
    const session = makeSession(user);

    const { result } = renderHook(() => useSession(), {
      wrapper: wrapperFor(session),
    });

    expect(result.current.session).toBe(session);
    expect(result.current.user).toBe(user);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it.each<[string, Role | string, boolean]>([
    ["admin", "admin", true],
    ["administrator", "administrator", true],
    ["ADMIN in upper case", "ADMIN", true],
    ["Administrator capitalised", "Administrator", true],
    ["auditor", "auditor", false],
    ["viewer", "viewer", false],
    ["an unknown role", "guest", false],
  ])("derives isAdmin from the %s role", (_label, role, expected) => {
    const session = makeSession(makeUser({ role: role as Role }));

    const { result } = renderHook(() => useSession(), {
      wrapper: wrapperFor(session),
    });

    expect(result.current.isAdmin).toBe(expected);
  });

  it("is not admin when there is no user", () => {
    const session = makeSession(null);

    const { result } = renderHook(() => useSession(), {
      wrapper: wrapperFor(session),
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("keeps the value memoised while the session does not change", () => {
    const session = makeSession(makeUser());

    const { result, rerender } = renderHook(() => useSession(), {
      wrapper: wrapperFor(session),
    });

    const first = result.current;
    rerender();

    expect(result.current).toBe(first);
  });
});
