import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  serverEnv: vi.fn(),
  passwordAuth: vi.fn(),
  refreshAuth: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@shared/config/env", () => ({ serverEnv: mocks.serverEnv }));
vi.mock("@features/auth/api/cognito.repo.impl", () => ({
  initiateAuthWithPassword: mocks.passwordAuth,
  initiateAuthWithRefreshToken: mocks.refreshAuth,
  globalSignOut: mocks.signOut,
}));

import { DELETE as logout, POST as login } from "./route";
import { POST as refresh } from "./refresh/route";

const cookieNames = { accessName: "access", refreshName: "refresh", sessionName: "session" };

function jar(values: Record<string, string> = {}) {
  return {
    get: vi.fn((name: string) => values[name] ? { value: values[name] } : undefined),
    set: vi.fn(),
  };
}

describe("session BFF routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.serverEnv.mockReturnValue({
      cookies: { ...cookieNames, secure: true, sameSite: "Lax", domain: "example.test" },
    });
  });

  it("logs in, sets all cookies, and never exposes tokens", async () => {
    const cookieJar = jar();
    mocks.cookies.mockResolvedValue(cookieJar);
    mocks.passwordAuth.mockResolvedValue({ accessToken: "access-value", refreshToken: "refresh-value", expiresInSeconds: 3600 });
    const response = await login(new Request("http://localhost/api/session", {
      method: "POST",
      body: JSON.stringify({ username: "admin@example.test", password: "secret" }),
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.passwordAuth).toHaveBeenCalledWith("admin@example.test", "secret");
    expect(response.cookies.get("access")?.value).toBe("access-value");
    expect(response.cookies.get("refresh")?.value).toBe("refresh-value");
    expect(response.cookies.get("session")?.value).toBe("1");
  });

  it("supports a provider response without a replacement refresh token", async () => {
    mocks.cookies.mockResolvedValue(jar());
    mocks.passwordAuth.mockResolvedValue({ accessToken: "access-value", expiresInSeconds: 60 });
    const response = await login(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ username: "u", password: "p" }),
    }));
    expect(response.status).toBe(200);
    expect(response.cookies.get("refresh")).toBeUndefined();
  });

  it.each([
    ["UNAUTHORIZED", 401],
    ["NotAuthorizedException", 401],
    ["BAD_REQUEST", 400],
    ["VALIDATION_ERROR", 400],
    ["RATE_LIMITED", 429],
    ["FORBIDDEN", 403],
    ["NOT_FOUND", 404],
    ["SERVER_ERROR", 502],
    ["UNKNOWN", 400],
  ])("maps login error %s to %s", async (code, status) => {
    mocks.cookies.mockResolvedValue(jar());
    mocks.passwordAuth.mockRejectedValue({ code, message: `error-${code}` });
    const response = await login(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ username: "u", password: "p" }),
    }));
    expect(response.status).toBe(status);
    expect((await response.json()).message).toBe(`error-${code}`);
    if (status === 401) {
      expect(response.cookies.get("access")?.value).toBe("");
    }
  });

  it("maps malformed credentials without leaking validation internals", async () => {
    mocks.cookies.mockResolvedValue(jar());
    const response = await login(new Request("http://localhost", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
    expect((await response.json()).ok).toBe(false);
    expect(mocks.passwordAuth).not.toHaveBeenCalled();
  });

  it("signs out when access exists and always clears cookies", async () => {
    mocks.cookies.mockResolvedValue(jar({ access: "access-value" }));
    expect((await logout()).status).toBe(204);
    expect(mocks.signOut).toHaveBeenCalledWith("access-value");
  });

  it("clears cookies when signout is absent or fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.cookies.mockResolvedValueOnce(jar());
    expect((await logout()).status).toBe(204);
    expect(mocks.signOut).not.toHaveBeenCalled();

    mocks.cookies.mockResolvedValueOnce(jar({ access: "access-value" }));
    mocks.signOut.mockRejectedValueOnce(new Error("provider down"));
    expect((await logout()).status).toBe(204);
  });

  it("rejects refresh without token and awaits cookie cleanup", async () => {
    const cookieJar = jar();
    mocks.cookies.mockResolvedValue(cookieJar);
    const response = await refresh();
    expect(response.status).toBe(401);
    expect(cookieJar.set).toHaveBeenCalledTimes(3);
    expect(mocks.refreshAuth).not.toHaveBeenCalled();
  });

  it("refreshes access and optional refresh cookies before returning", async () => {
    const cookieJar = jar({ refresh: "refresh-value" });
    mocks.cookies.mockResolvedValue(cookieJar);
    mocks.refreshAuth.mockResolvedValue({ accessToken: "new-access", refreshToken: "new-refresh", expiresInSeconds: 120 });
    const response = await refresh();
    expect(response.status).toBe(200);
    expect(cookieJar.set).toHaveBeenCalledTimes(3);
    expect(mocks.refreshAuth).toHaveBeenCalledWith("refresh-value");
  });

  it("does not replace the refresh cookie when Cognito omits it", async () => {
    const cookieJar = jar({ refresh: "refresh-value" });
    mocks.cookies.mockResolvedValue(cookieJar);
    mocks.refreshAuth.mockResolvedValue({ accessToken: "new-access", expiresInSeconds: 120 });
    expect((await refresh()).status).toBe(200);
    expect(cookieJar.set).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["UNAUTHORIZED", 401, true],
    ["NotAuthorizedException", 401, true],
    ["FORBIDDEN", 401, true],
    ["RATE_LIMITED", 429, false],
    ["BAD_REQUEST", 400, false],
    ["VALIDATION_ERROR", 400, false],
    ["NOT_FOUND", 404, false],
    ["SERVER_ERROR", 502, false],
    ["UNKNOWN", 400, false],
  ])("maps refresh error %s", async (code, status, clearsCookies) => {
    const cookieJar = jar({ refresh: "refresh-value" });
    mocks.cookies.mockResolvedValue(cookieJar);
    mocks.refreshAuth.mockRejectedValue({ code, message: `error-${code}` });
    const response = await refresh();
    expect(response.status).toBe(status);
    expect(cookieJar.set).toHaveBeenCalledTimes(clearsCookies ? 3 : 0);
  });
});
