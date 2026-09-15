// ---------------------------------------------------------------------------
// Tests para handleSessionExpiration.
//
// El módulo mantiene estado global (isHandlingExpiration), por eso cada caso
// hace vi.resetModules() + import() dinámico para arrancar con estado limpio.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { logoutMock } = vi.hoisted(() => ({ logoutMock: vi.fn() }));

// El use case real importa httpClient (valida env al importar): lo mockeamos.
vi.mock("@features/auth/lib/usecases/login", () => ({
  logout: logoutMock,
}));

/** Reemplaza window.location por un objeto observable. */
function stubLocation(): { href: string } {
  const fake = { href: "" };
  vi.stubGlobal("location", fake);
  return fake;
}

describe("handleSessionExpiration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    logoutMock.mockResolvedValue(undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("logs out and redirects to /login", async () => {
    const loc = stubLocation();
    const { handleSessionExpiration } = await import(
      "../session-expiration-handler"
    );

    await handleSessionExpiration();

    expect(logoutMock).toHaveBeenCalledOnce();
    expect(loc.href).toBe("/login");
    expect(console.warn).toHaveBeenCalledWith(
      "[SessionExpiration] Session expired — redirecting to login."
    );
  });

  it("still redirects when logout fails", async () => {
    const loc = stubLocation();
    logoutMock.mockRejectedValueOnce(new Error("network down"));

    const { handleSessionExpiration } = await import(
      "../session-expiration-handler"
    );

    await expect(handleSessionExpiration()).resolves.toBeUndefined();

    expect(loc.href).toBe("/login");
    expect(console.warn).toHaveBeenCalledWith(
      "[SessionExpiration] Logout failed during expiration handling:",
      expect.any(Error)
    );
  });

  it("ignores re-entrant calls while an expiration is being handled", async () => {
    vi.useFakeTimers();
    const loc = stubLocation();

    const { handleSessionExpiration } = await import(
      "../session-expiration-handler"
    );

    await handleSessionExpiration();
    expect(logoutMock).toHaveBeenCalledTimes(1);

    // El flag sigue activo: la segunda llamada retorna sin hacer nada.
    loc.href = "";
    await handleSessionExpiration();
    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(loc.href).toBe("");
  });

  it("resets the guard 1000ms after finishing", async () => {
    vi.useFakeTimers();
    stubLocation();

    const { handleSessionExpiration } = await import(
      "../session-expiration-handler"
    );

    await handleSessionExpiration();
    expect(logoutMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);

    await handleSessionExpiration();
    expect(logoutMock).toHaveBeenCalledTimes(2);
  });
});
