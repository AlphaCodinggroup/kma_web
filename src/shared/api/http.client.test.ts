import { beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  requestUse: vi.fn(),
  installAuth: vi.fn(),
  installError: vi.fn(),
  expiration: vi.fn(),
}));

const instance = {
  interceptors: {
    request: { use: mocks.requestUse },
  },
};

vi.mock("axios", () => ({
  default: { create: mocks.create },
  AxiosError: class AxiosError extends Error {},
}));
vi.mock("@shared/config/env", () => ({
  PublicEnv: { httpTimeoutMs: 1234 },
}));
vi.mock("@shared/interceptors/auth", () => ({
  installAuthInterceptor: mocks.installAuth,
}));
vi.mock("@shared/interceptors/error", () => ({
  installErrorInterceptor: mocks.installError,
}));
vi.mock("@shared/lib/session-expiration-handler", () => ({
  handleSessionExpiration: mocks.expiration,
}));

type RequestSuccess = (config: {
  url?: string;
  baseURL?: string;
  method?: string;
  headers?: Record<string, unknown>;
}) => unknown;
type RequestFailure = (error: unknown) => Promise<never>;

let success: RequestSuccess;
let failure: RequestFailure;

describe("browser HTTP client", () => {
  beforeAll(async () => {
    mocks.create.mockReturnValue(instance);
    await import("./http.client");
    [success, failure] = mocks.requestUse.mock.calls[0];
  });

  it("creates a credentialed JSON client and installs auth before error normalization", () => {
    expect(mocks.create).toHaveBeenCalledWith({
      baseURL: "/",
      timeout: 1234,
      withCredentials: true,
      headers: { Accept: "application/json" },
    });
    expect(mocks.installAuth).toHaveBeenCalledWith(instance, {
      onSessionExpired: mocks.expiration,
    });
    expect(mocks.installError).toHaveBeenCalledWith(instance);
    expect(mocks.installAuth.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.installError.mock.invocationCallOrder[0]
    );
  });

  it("forces relative BFF routes to same-origin and supplies JSON content type", () => {
    const config = { url: "/api/audits", baseURL: "https://backend", method: "POST", headers: {} };
    expect(success(config)).toBe(config);
    expect(config).toMatchObject({ baseURL: "", headers: { "Content-Type": "application/json" } });
  });

  it("keeps absolute URLs and existing content type headers", () => {
    const upper = {
      url: "https://uploads.example/file",
      method: "PUT",
      headers: { "Content-Type": "image/png" },
    };
    success(upper);
    expect(upper.headers).toEqual({ "Content-Type": "image/png" });

    const lower = {
      url: "/external",
      baseURL: "https://custom.example",
      method: "PATCH",
      headers: { "content-type": "application/custom" },
    };
    success(lower);
    expect(lower.headers).toEqual({ "content-type": "application/custom" });
  });

  it("uses the fallback base URL only for relative external paths without one", () => {
    const config: {
      url: string;
      method: string;
      headers: Record<string, unknown>;
      baseURL?: string;
    } = { url: "resource", method: "GET", headers: {} };
    success(config);
    expect(config.baseURL).toBe("/");
    expect(config.headers).toEqual({});
  });

  it("handles absent URL, method and headers", () => {
    const config: { url?: string; method?: string; headers?: Record<string, unknown>; baseURL?: string } = {};
    expect(success(config)).toEqual({ baseURL: "/" });
  });

  it("normalizes request interceptor errors with a provider or fallback message", async () => {
    await expect(failure({ message: "invalid request" })).rejects.toThrow("invalid request");
    await expect(failure(null)).rejects.toThrow(
      "Request interceptor failed before sending the request."
    );
  });
});
