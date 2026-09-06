import { cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@entities/user/model/sessions";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  getCookie: vi.fn(),
  decode: vi.fn(),
  mapUser: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@shared/config/env", () => ({
  serverEnv: () => ({ cookies: { accessName: "access_cookie" } }),
}));
vi.mock("@shared/lib/jwt", () => ({ decodeJwtPayload: mocks.decode }));
vi.mock("@entities/user/lib/mappers", () => ({ mapCognitoClaimsToUser: mocks.mapUser }));

import { AuthProvider, useSession as useContextSession } from "./context";
import { useSession } from "./hooks";
import { getServerSession } from "./session";

afterEach(cleanup);

const user = {
  id: "user-1",
  name: "Alice",
  username: "alice",
  email: null,
  role: "viewer" as const,
};

describe("client auth context", () => {
  it.each([
    ["admin", true],
    ["administrator", true],
    ["auditor", false],
    ["viewer", false],
  ] as const)("derives the %s role permissions", (role, isAdmin) => {
    const session: Session = { authenticated: true, user: { ...user, role } };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider session={session}>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useSession(), { wrapper });
    expect(result.current).toMatchObject({ session, user: session.user, isAuthenticated: true, isAdmin });
  });

  it("represents an anonymous session", () => {
    const session: Session = { authenticated: false, user: null };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider session={session}>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useContextSession(), { wrapper });
    expect(result.current).toMatchObject({ user: null, isAuthenticated: false, isAdmin: false });
  });

  it("rejects use outside the provider", () => {
    expect(() => renderHook(() => useSession())).toThrow(
      "useSession must be used within an AuthProvider"
    );
  });
});

describe("server session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue({ get: mocks.getCookie });
  });

  it("returns anonymous when the cookie is absent", async () => {
    mocks.getCookie.mockReturnValue(undefined);
    await expect(getServerSession()).resolves.toEqual({ user: null, authenticated: false });
    expect(mocks.decode).not.toHaveBeenCalled();
  });

  it("returns anonymous for undecodable or expired tokens", async () => {
    mocks.getCookie.mockReturnValue({ value: "token" });
    mocks.decode.mockReturnValueOnce(null);
    await expect(getServerSession()).resolves.toEqual({ user: null, authenticated: false });

    mocks.decode.mockReturnValueOnce({ exp: Math.floor(Date.now() / 1000) - 1 });
    await expect(getServerSession()).resolves.toEqual({ user: null, authenticated: false });
  });

  it("maps valid claims into an authenticated user", async () => {
    const claims = { sub: "user-1", exp: Math.floor(Date.now() / 1000) + 60 };
    mocks.getCookie.mockReturnValue({ value: "token" });
    mocks.decode.mockReturnValue(claims);
    mocks.mapUser.mockReturnValue(user);
    await expect(getServerSession()).resolves.toEqual({ user, authenticated: true });
    expect(mocks.mapUser).toHaveBeenCalledWith(claims);
  });

  it("allows claims without exp and fails closed when mapping rejects", async () => {
    mocks.getCookie.mockReturnValue({ value: "token" });
    mocks.decode.mockReturnValue({ sub: "user-1" });
    mocks.mapUser.mockImplementationOnce(() => {
      throw new Error("invalid claims");
    });
    await expect(getServerSession()).resolves.toEqual({ user: null, authenticated: false });
  });
});
