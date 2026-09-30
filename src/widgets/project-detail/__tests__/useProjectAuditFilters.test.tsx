/**
 * Filtros del proyecto en la URL: se leen al montar, se escriben al cambiar y
 * se ignoran los valores que no están entre las opciones.
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = { search: "", pathname: "/projects/p-1" as string | null };

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

// Sin debounce: el hook real tiene sus propias pruebas.
vi.mock("@shared/lib/useDebouncedSearch", () => ({
  useDebouncedSearch: (value: string) => value.trim().toLowerCase(),
}));

import { useProjectAuditFilters } from "../useProjectAuditFilters";
import type { AuditFilterOptions } from "../lib/audit-filters";

const options: AuditFilterOptions = {
  facilities: [{ value: "f-1", label: "House 1" }],
  flows: [{ value: "flow-1", label: "Ramps" }],
  statuses: [{ value: "completed", label: "Completed" }],
};

const replaceState = vi.spyOn(window.history, "replaceState");

beforeEach(() => {
  vi.clearAllMocks();
  replaceState.mockImplementation(() => {});
  nav.search = "";
  nav.pathname = "/projects/p-1";
});

describe("useProjectAuditFilters", () => {
  it("starts without filters", () => {
    const { result } = renderHook(() => useProjectAuditFilters(options));

    expect(result.current).toMatchObject({
      filters: { query: "", facility: "", flow: "", status: "" },
      isFiltering: false,
      hasValues: false,
      queryString: "",
    });
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("reads the url once and ignores unknown values", () => {
    nav.search = "q=Ramp&facility=f-1&flow=gone&status=completed";

    const { result } = renderHook(() => useProjectAuditFilters(options));

    expect(result.current.filters).toEqual({
      query: "Ramp",
      facility: "f-1",
      flow: "",
      status: "completed",
    });
    expect(result.current.query).toBe("ramp");
    expect(result.current.queryString).toBe("q=Ramp&facility=f-1&status=completed");
    expect(result.current.isFiltering).toBe(true);
  });

  it("writes each change to the url", () => {
    const { result } = renderHook(() => useProjectAuditFilters(options));

    act(() => result.current.setFilter("status", "completed"));

    expect(result.current.isFiltering).toBe(true);
    expect(replaceState).toHaveBeenLastCalledWith(
      window.history.state,
      "",
      "/projects/p-1?status=completed"
    );
  });

  it("marks a search as loaded before it filters", () => {
    const { result } = renderHook(() => useProjectAuditFilters(options));

    act(() => result.current.setFilter("query", "  "));

    expect(result.current.isFiltering).toBe(false);
    expect(result.current.hasValues).toBe(false);

    act(() => result.current.setFilter("query", "r"));
    expect(result.current.hasValues).toBe(true);
  });

  it("clears every filter and the url", () => {
    nav.search = "status=completed";
    const { result } = renderHook(() => useProjectAuditFilters(options));

    act(() => result.current.clear());

    expect(result.current.isFiltering).toBe(false);
    expect(replaceState).toHaveBeenLastCalledWith(window.history.state, "", "/projects/p-1");
  });

  it("keeps a value until its option loads", () => {
    nav.search = "flow=flow-2";
    const { result, rerender } = renderHook(
      ({ opts }) => useProjectAuditFilters(opts),
      { initialProps: { opts: options } }
    );
    expect(result.current.filters.flow).toBe("");

    rerender({
      opts: { ...options, flows: [...options.flows, { value: "flow-2", label: "Doors" }] },
    });

    expect(result.current.filters.flow).toBe("flow-2");
  });

  it("does not write without a pathname", () => {
    nav.pathname = null;
    const { result } = renderHook(() => useProjectAuditFilters(options));

    act(() => result.current.setFilter("status", "completed"));

    expect(replaceState).not.toHaveBeenCalled();
  });
});
