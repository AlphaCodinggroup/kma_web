import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ logout: vi.fn() }));
vi.mock("@features/auth/lib/usecases/login", () => ({ logout: mocks.logout }));

import { handleSessionExpiration } from "./session-expiration-handler";

describe("session expiration handler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.logout.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("logs out and redirects to login", async () => {
    mocks.logout.mockResolvedValue(undefined);
    await handleSessionExpiration();
    expect(mocks.logout).toHaveBeenCalledOnce();
    expect(window.location.pathname).toBe("/login");
    expect(console.warn).toHaveBeenCalledWith(
      "[SessionExpiration] Session expired — redirecting to login."
    );
  });

  it("still redirects when logout fails", async () => {
    const error = new Error("logout unavailable");
    mocks.logout.mockRejectedValue(error);
    await handleSessionExpiration();
    expect(window.location.pathname).toBe("/login");
    expect(console.warn).toHaveBeenCalledWith(
      "[SessionExpiration] Logout failed during expiration handling:",
      error
    );
  });

  it("coalesces simultaneous expiration notifications", async () => {
    let finishLogout: (() => void) | undefined;
    mocks.logout.mockImplementation(
      () => new Promise<void>((resolve) => {
        finishLogout = resolve;
      })
    );
    const first = handleSessionExpiration();
    await Promise.resolve();
    await expect(handleSessionExpiration()).resolves.toBeUndefined();
    expect(mocks.logout).toHaveBeenCalledOnce();
    finishLogout?.();
    await first;

    await vi.advanceTimersByTimeAsync(1000);
    mocks.logout.mockResolvedValue(undefined);
    await handleSessionExpiration();
    expect(mocks.logout).toHaveBeenCalledTimes(2);
  });
});
