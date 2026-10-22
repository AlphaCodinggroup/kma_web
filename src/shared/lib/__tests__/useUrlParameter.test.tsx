import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useInsertionEffect, useState, type ReactNode } from "react";
import { SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { useUrlParameter } from "../useUrlParameter";

describe("useUrlParameter", () => {
  beforeEach(() => window.history.replaceState(null, "", "/projects"));

  it("restores a saved filter from the current URL", () => {
    window.history.replaceState(null, "", "/projects?tab=facilities&q=ramps");
    const { result } = renderHook(() => useUrlParameter("q"));
    expect(result.current[0]).toBe("ramps");
  });

  it("preserves other filters and the fragment when changing a value", () => {
    window.history.replaceState(null, "", "/projects?tab=facilities#results");
    const { result } = renderHook(() => useUrlParameter("q"));
    act(() => result.current[1]("North ramp"));
    expect(result.current[0]).toBe("North ramp");
    expect(new URLSearchParams(window.location.search).get("tab")).toBe("facilities");
    expect(window.location.hash).toBe("#results");
  });

  it("removes a default value and synchronizes subscribers", () => {
    const first = renderHook(() => useUrlParameter("status", "active"));
    const second = renderHook(() => useUrlParameter("status", "active"));
    act(() => first.result.current[1]("archived"));
    expect(second.result.current[0]).toBe("archived");
    act(() => second.result.current[1]("active"));
    expect(first.result.current[0]).toBe("active");
    expect(window.location.search).toBe("");
  });

  it("restores filters on browser back and forward events", () => {
    const { result } = renderHook(() => useUrlParameter("q"));
    act(() => {
      window.history.replaceState(null, "", "/projects?q=previous");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current[0]).toBe("previous");
  });

  it("allows Next to restore its router while preserving custom history state", () => {
    window.history.replaceState({ __NA: true, _N: true, __PRIVATE_NEXTJS_INTERNALS_TREE: {}, scrollPosition: 48 }, "", "/projects");
    const { result } = renderHook(() => useUrlParameter("tab", "projects"));
    act(() => result.current[1]("facilities"));
    expect(window.history.state.scrollPosition).toBe(48);
    expect(window.history.state.__NA).toBeUndefined();
    expect(window.history.state._N).toBeUndefined();
    expect(window.history.state.__PRIVATE_NEXTJS_INTERNALS_TREE).toBeUndefined();
  });

  it("follows navigation when Next commits the browser URL after rendering context", () => {
    window.history.replaceState(null, "", "/projects?tab=facilities");
    let navigate: () => void = () => undefined;
    function RouterContext({ children }: { children: ReactNode }) {
      const [params, setParams] = useState(new URLSearchParams(window.location.search));
      useInsertionEffect(() => {
        window.history.replaceState(null, "", `/projects?${params.toString()}`);
      }, [params]);
      navigate = () => {
        setParams(new URLSearchParams("tab=projects"));
      };
      return <SearchParamsContext.Provider value={params}>{children}</SearchParamsContext.Provider>;
    }
    const { result } = renderHook(() => useUrlParameter("tab", "projects"), { wrapper: RouterContext });
    expect(result.current[0]).toBe("facilities");
    act(() => navigate());
    expect(result.current[0]).toBe("projects");
  });
});
