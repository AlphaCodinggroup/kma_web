import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "../useMediaQuery";

afterEach(() => vi.unstubAllGlobals());

describe("responsive viewport subscription", () => {
  it("uses a stable fallback when media queries are unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(renderHook(() => useMediaQuery("(max-width: 1023px)")).result.current).toBe(false);
  });

  it("responds to resize and removes its listener on unmount", () => {
    const listeners = new Set<() => void>();
    const media = { matches: false, addEventListener: vi.fn((_event, callback) => listeners.add(callback)), removeEventListener: vi.fn((_event, callback) => listeners.delete(callback)) };
    vi.stubGlobal("matchMedia", vi.fn(() => media));
    const { result, unmount } = renderHook(() => useMediaQuery("(max-width: 1023px)"));
    expect(result.current).toBe(false);
    act(() => { media.matches = true; listeners.forEach(listener => listener()); });
    expect(result.current).toBe(true);
    unmount();
    expect(listeners.size).toBe(0);
    expect(media.removeEventListener).toHaveBeenCalledOnce();
  });
});
