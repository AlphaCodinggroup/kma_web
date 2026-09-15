// ---------------------------------------------------------------------------
// Tests for the useSession re-export in the auth process
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import type { Session, User } from "@entities/user/model/sessions";
import { AuthProvider } from "../context";
import { useSession } from "../hooks";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(user: User | null): Session {
  return { user, authenticated: Boolean(user) };
}

const adminUser: User = {
  id: "cognito-1",
  name: "Jane Doe",
  username: "jane",
  email: "jane@test.com",
  role: "admin",
  avatarUrl: null,
  lastLoginAt: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useSession (process re-export)", () => {
  it("returns the same value as the context hook", () => {
    const session = makeSession(adminUser);

    function wrapper({ children }: { children: ReactNode }) {
      return <AuthProvider session={session}>{children}</AuthProvider>;
    }

    const { result } = renderHook(() => useSession(), { wrapper });

    expect(result.current).toEqual({
      session,
      user: adminUser,
      isAuthenticated: true,
      isAdmin: true,
    });
  });

  it("throws when it is used outside of the provider", () => {
    expect(() => renderHook(() => useSession())).toThrow(
      "useSession must be used within an AuthProvider"
    );
  });
});
