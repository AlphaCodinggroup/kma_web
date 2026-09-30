// ---------------------------------------------------------------------------
// Tests para useDebouncedSearch: normalización, mínimo de caracteres y debounce.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDebouncedSearch } from "../useDebouncedSearch";

describe("useDebouncedSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with an empty debounced value", () => {
    const { result } = renderHook(() => useDebouncedSearch("hello"));
    expect(result.current).toBe("");
  });

  // Camino feliz: se normaliza (trim + lowercase) y se emite tras el delay.
  it.each([
    ["  Hello  ", "hello"],
    ["WORLD", "world"],
    ["MiXeD CaSe", "mixed case"],
  ])("normalizes %s into %s after the delay", (raw, expected) => {
    const { result } = renderHook(() => useDebouncedSearch(raw));

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe(expected);
  });

  // Por debajo del mínimo el valor se vacía sin programar timers.
  it.each([
    ["", 2],
    ["a", 2],
    ["ab", 3],
  ])("keeps the value empty for %s with minLength %i", (raw, minLength) => {
    const { result } = renderHook(() =>
      useDebouncedSearch(raw, { minLength })
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current).toBe("");
  });

  it("does not emit before the delay elapses", () => {
    const { result } = renderHook(() =>
      useDebouncedSearch("query", { delay: 500 })
    );

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current).toBe("");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("query");
  });

  it("cancels the pending timer when the query changes", () => {
    const { result, rerender } = renderHook(
      ({ q }: { q: string }) => useDebouncedSearch(q),
      { initialProps: { q: "first" } }
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ q: "second" });

    act(() => {
      vi.advanceTimersByTime(200);
    });
    // El primer timer fue cancelado: aún no hay valor emitido.
    expect(result.current).toBe("");

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("second");
  });

  it("clears the debounced value when the query drops below the minimum", () => {
    const { result, rerender } = renderHook(
      ({ q }: { q: string }) => useDebouncedSearch(q),
      { initialProps: { q: "abc" } }
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("abc");

    rerender({ q: "a" });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("");
  });

  it("honours a custom delay and minLength together", () => {
    const { result } = renderHook(() =>
      useDebouncedSearch("XY", { delay: 50, minLength: 2 })
    );

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(result.current).toBe("xy");
  });
});
