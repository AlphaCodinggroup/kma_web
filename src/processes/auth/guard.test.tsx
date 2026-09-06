import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  getCookie: vi.fn(),
  redirect: vi.fn(),
  verify: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@shared/config/env", () => ({
  serverEnv: () => ({ cookies: { accessName: "access_cookie" } }),
}));
vi.mock("@shared/auth/verify-access-token", () => ({
  verifyAccessToken: mocks.verify,
}));

import AuthGuard from "./guard";

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue({ get: mocks.getCookie });
  });

  it("renders private content only after cryptographic token verification", async () => {
    mocks.getCookie.mockReturnValue({ value: "signed-access-token" });
    mocks.verify.mockResolvedValue({ sub: "user-1" });
    const result = await AuthGuard({ children: "Private content" });
    expect(mocks.verify).toHaveBeenCalledWith("signed-access-token");
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(result.props.children).toBe("Private content");
  });

  it("redirects when the access cookie is absent", async () => {
    mocks.getCookie.mockReturnValue(undefined);
    await AuthGuard({ children: "Private content" });
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects when a present token fails verification", async () => {
    mocks.getCookie.mockReturnValue({ value: "forged-token" });
    mocks.verify.mockRejectedValue(new Error("invalid signature"));
    await AuthGuard({ children: "Private content" });
    expect(mocks.verify).toHaveBeenCalledWith("forged-token");
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });
});
