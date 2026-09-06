import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatIsoToYmdHm } from "./date";
import { useDebouncedSearch } from "./useDebouncedSearch";

describe("date formatting", () => {
  it.each([
    [undefined, "-"],
    [null, "-"],
    [" ", "-"],
    ["2026-09-05T12:34:56Z", "2026-09-05 12:34"],
    ["2026-09-05 12:34:00Z", "2026-09-05 12:34"],
    ["invalid", "invalid"],
  ])("formats %s", (value, expected) => {
    expect(formatIsoToYmdHm(value)).toBe(expected);
  });
});

describe("debounced search", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("normalizes a query after the default delay", () => {
    const { result } = renderHook(() => useDebouncedSearch("  PLANT  "));
    expect(result.current).toBe("");
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe("plant");
  });

  it("clears short queries and respects custom options", () => {
    const { result, rerender } = renderHook(
      ({ query }) => useDebouncedSearch(query, { delay: 50, minLength: 3 }),
      { initialProps: { query: "abc" } }
    );
    act(() => vi.advanceTimersByTime(50));
    expect(result.current).toBe("abc");
    rerender({ query: "a" });
    expect(result.current).toBe("");
  });

  it("cancels the previous timer when input changes", () => {
    const clear = vi.spyOn(window, "clearTimeout");
    const { result, rerender, unmount } = renderHook(
      ({ query }) => useDebouncedSearch(query, { delay: 100 }),
      { initialProps: { query: "first" } }
    );
    rerender({ query: "second" });
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe("second");
    unmount();
    expect(clear).toHaveBeenCalled();
  });
});
