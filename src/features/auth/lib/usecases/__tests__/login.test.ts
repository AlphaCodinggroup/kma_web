// ---------------------------------------------------------------------------
// Tests for login use case (loginWithPassword, logout)
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AxiosResponse } from "axios";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE importing the module under test
// ---------------------------------------------------------------------------

// Mock httpClient from @shared/api/http.client
const mockPost = vi.fn<(...args: unknown[]) => Promise<AxiosResponse>>();
const mockDelete = vi.fn<(...args: unknown[]) => Promise<AxiosResponse>>();

vi.mock("@shared/api/http.client", () => ({
  httpClient: {
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

// Mock the error interceptor — we re-export the real helpers so the use case
// can still construct ApiError objects, but we keep createApiError passthrough
// to avoid hiding assertion details.
vi.mock("@shared/interceptors/error", async () => {
  const actual = await vi.importActual<
    typeof import("@shared/interceptors/error")
  >("@shared/interceptors/error");
  return {
    ...actual,
    // createApiError is used in the catch blocks; keep real implementation
    createApiError: actual.createApiError,
  };
});

// ---------------------------------------------------------------------------
// Import module under test (after mocks are declared)
// ---------------------------------------------------------------------------

import { loginWithPassword, logout } from "../login";
import type { LoginInput } from "../login";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal AxiosResponse-like object. */
function fakeResponse<T>(status: number, data: T): AxiosResponse<T> {
  return {
    status,
    statusText: status === 200 ? "OK" : "Error",
    data,
    headers: {},
    config: { headers: {} },
  } as unknown as AxiosResponse<T>;
}

// ---------------------------------------------------------------------------
// loginWithPassword
// ---------------------------------------------------------------------------

describe("loginWithPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Success ----------------------------------------------------------

  it("returns { ok: true } on successful authentication", async () => {
    mockPost.mockResolvedValueOnce(fakeResponse(200, { ok: true }));

    const input: LoginInput = { username: "admin", password: "Secret1!" };
    const result = await loginWithPassword(input);

    expect(result).toEqual({ ok: true });
    expect(mockPost).toHaveBeenCalledOnce();
    expect(mockPost).toHaveBeenCalledWith("/api/session", {
      username: "admin",
      password: "Secret1!",
    });
  });

  // ---- Validation errors ------------------------------------------------

  it("throws VALIDATION_ERROR when username is empty", async () => {
    const input: LoginInput = { username: "", password: "Secret1!" };

    await expect(loginWithPassword(input)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: expect.stringContaining("Username"),
    });

    // httpClient.post should NOT have been called
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("throws VALIDATION_ERROR when password is empty", async () => {
    const input: LoginInput = { username: "admin", password: "" };

    await expect(loginWithPassword(input)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: expect.stringContaining("Password"),
    });

    expect(mockPost).not.toHaveBeenCalled();
  });

  it("throws VALIDATION_ERROR when both fields are missing", async () => {
    // Force cast to bypass TS — runtime validation should still catch it
    const input = {} as LoginInput;

    await expect(loginWithPassword(input)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });

    expect(mockPost).not.toHaveBeenCalled();
  });

  // ---- API error (server returns JSON error body) -----------------------

  it("throws AUTH_FAILED when server responds with ok: false", async () => {
    mockPost.mockResolvedValueOnce(
      fakeResponse(401, {
        ok: false,
        code: "NotAuthorizedException",
        message: "Incorrect username or password.",
      })
    );

    const input: LoginInput = { username: "admin", password: "wrong" };

    await expect(loginWithPassword(input)).rejects.toMatchObject({
      code: "NotAuthorizedException",
      message: "Incorrect username or password.",
    });
  });

  it("throws AUTH_FAILED with default message when server error has no code", async () => {
    mockPost.mockResolvedValueOnce(
      fakeResponse(403, {
        ok: false,
        code: "",
        message: "",
      })
    );

    const input: LoginInput = { username: "admin", password: "wrong" };

    await expect(loginWithPassword(input)).rejects.toMatchObject({
      code: "AUTH_FAILED",
    });
  });

  it("throws AUTH_FAILED on non-200 with unexpected body shape", async () => {
    mockPost.mockResolvedValueOnce(
      fakeResponse(500, { unexpected: "payload" })
    );

    const input: LoginInput = { username: "admin", password: "Secret1!" };

    await expect(loginWithPassword(input)).rejects.toMatchObject({
      code: "AUTH_FAILED",
      message: expect.stringContaining("500"),
    });
  });

  // ---- Network / unexpected errors -------------------------------------

  it("normalizes a network error (no response) to ApiError", async () => {
    // createApiError checks isApiError(input) first — an AxiosError has both
    // code (string) and message (string) so it passes the type guard and is
    // returned as-is. In production the error interceptor on httpClient
    // normalizes AxiosErrors before they reach the use case catch block.
    // Here we simulate what the error interceptor would produce.
    const normalizedNetworkError = {
      code: "NETWORK_ERROR",
      message: "Network error. Please check your connection and try again.",
    };
    mockPost.mockRejectedValueOnce(normalizedNetworkError);

    const input: LoginInput = { username: "admin", password: "Secret1!" };

    await expect(loginWithPassword(input)).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
  });

  it("normalizes a timeout error to ApiError", async () => {
    const normalizedTimeoutError = {
      code: "TIMEOUT",
      message: "The request timed out. Please try again.",
    };
    mockPost.mockRejectedValueOnce(normalizedTimeoutError);

    const input: LoginInput = { username: "admin", password: "Secret1!" };

    await expect(loginWithPassword(input)).rejects.toMatchObject({
      code: "TIMEOUT",
    });
  });

  it("normalizes a random thrown string to UNKNOWN_ERROR", async () => {
    mockPost.mockRejectedValueOnce("something went wrong");

    const input: LoginInput = { username: "admin", password: "Secret1!" };

    await expect(loginWithPassword(input)).rejects.toMatchObject({
      code: "UNKNOWN_ERROR",
    });
  });
});

// ---------------------------------------------------------------------------
// logout
// ---------------------------------------------------------------------------

describe("logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves on HTTP 204", async () => {
    mockDelete.mockResolvedValueOnce(fakeResponse(204, null));

    await expect(logout()).resolves.toBeUndefined();
    expect(mockDelete).toHaveBeenCalledOnce();
    expect(mockDelete).toHaveBeenCalledWith("/api/session");
  });

  it("throws LOGOUT_FAILED on non-204 status", async () => {
    mockDelete.mockResolvedValueOnce(fakeResponse(500, { ok: false }));

    await expect(logout()).rejects.toMatchObject({
      code: "LOGOUT_FAILED",
      message: expect.stringContaining("500"),
    });
  });

  it("normalizes network errors during logout", async () => {
    // In production, the error interceptor normalizes AxiosErrors before
    // they reach the use case. We simulate the normalized ApiError here.
    const normalizedNetworkError = {
      code: "NETWORK_ERROR",
      message: "Network error. Please check your connection and try again.",
    };
    mockDelete.mockRejectedValueOnce(normalizedNetworkError);

    await expect(logout()).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
  });
});
