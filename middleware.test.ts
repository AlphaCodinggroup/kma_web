import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyAccessToken = vi.hoisted(() => vi.fn());

vi.mock("@shared/auth/verify-access-token", () => ({ verifyAccessToken }));
vi.mock("@shared/config/env", () => ({
  serverEnv: () => ({ cookies: { accessName: "access_token" } }),
}));

import { middleware } from "./middleware";

const request = (method: string, pathname: string, token?: string) => {
  const value = new NextRequest(`http://localhost${pathname}`, { method });
  if (token) value.cookies.set("access_token", token);
  return value;
};

describe("API authorization middleware", () => {
  beforeEach(() => verifyAccessToken.mockReset());

  it.each(["/api/session", "/api/session/refresh"])(
    "allows the public endpoint %s without a token",
    async (pathname) => {
      const response = await middleware(request("POST", pathname));

      expect(response.status).toBe(200);
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(verifyAccessToken).not.toHaveBeenCalled();
    }
  );

  it("returns 401 when the access cookie is missing", async () => {
    const response = await middleware(request("GET", "/api/audits"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "Unauthorized" });
  });

  it("returns 401 when cryptographic verification fails", async () => {
    verifyAccessToken.mockRejectedValueOnce(new Error("expired"));

    const response = await middleware(
      request("GET", "/api/audits", "expired-token")
    );

    expect(verifyAccessToken).toHaveBeenCalledWith("expired-token");
    expect(response.status).toBe(401);
  });

  it("returns 403 when a valid viewer invokes an administrator command", async () => {
    verifyAccessToken.mockResolvedValueOnce({ "cognito:groups": ["viewer"] });

    const response = await middleware(
      request(
        "POST",
        "/api/audits-review/audit-1/complete-review",
        "viewer-token"
      )
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ message: "Forbidden" });
  });

  it.each(["admin", "administrator"])(
    "allows the administrator alias %s",
    async (group) => {
      verifyAccessToken.mockResolvedValueOnce({ "cognito:groups": [group] });

      const response = await middleware(
        request(
          "POST",
          "/api/audits-review/audit-1/complete-review",
          `${group}-token`
        )
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("x-middleware-next")).toBe("1");
    }
  );

  it("protects unknown API URLs with the read-role default", async () => {
    verifyAccessToken.mockResolvedValueOnce({ "cognito:groups": ["auditor"] });

    const response = await middleware(
      request("GET", "/api/future-resource", "auditor-token")
    );

    expect(response.status).toBe(200);
  });
});
