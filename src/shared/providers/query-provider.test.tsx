import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queryCacheOptions: {} as any,
  mutationCacheOptions: {} as any,
  clientOptions: {} as any,
  clear: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  QueryCache: class QueryCache {
    constructor(options: any) { mocks.queryCacheOptions = options; }
  },
  MutationCache: class MutationCache {
    constructor(options: any) { mocks.mutationCacheOptions = options; }
  },
  QueryClient: class QueryClient {
    clear = mocks.clear;
    constructor(options: any) { mocks.clientOptions = options; }
  },
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import RootLayout, { metadata } from "../../../app/layout";
import { QueryProvider } from "./query-provider";

describe("QueryProvider", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("creates one client with deterministic cache and retry policies", () => {
    const { rerender } = render(<QueryProvider><div>child</div></QueryProvider>);
    expect(screen.getByText("child")).toBeInTheDocument();
    const firstOptions = mocks.clientOptions;
    rerender(<QueryProvider><div>updated</div></QueryProvider>);
    expect(mocks.clientOptions).toBe(firstOptions);

    const queries = mocks.clientOptions.defaultOptions.queries;
    expect(queries).toMatchObject({
      staleTime: 120_000,
      gcTime: 300_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    });
    expect(queries.retry(0, new Error("offline"))).toBe(true);
    expect(queries.retry(2, new Error("offline"))).toBe(false);
    expect(queries.retry(0, { code: "UNAUTHORIZED", message: "expired" })).toBe(false);
  });

  it("ignores non-auth errors and clears once for repeated unauthorized errors", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<QueryProvider><div>child</div></QueryProvider>);
    mocks.queryCacheOptions.onError(new Error("offline"));
    expect(mocks.clear).not.toHaveBeenCalled();
    mocks.queryCacheOptions.onError({ code: "UNAUTHORIZED", message: "expired" });
    mocks.mutationCacheOptions.onError({ code: "UNAUTHORIZED", message: "expired again" });
    expect(mocks.clear).toHaveBeenCalledOnce();
  });
});

describe("RootLayout", () => {
  it("declares an English document and product metadata", () => {
    const element = RootLayout({ children: <main>content</main> }) as React.ReactElement<any>;
    expect(element.type).toBe("html");
    expect(element.props.lang).toBe("en");
    expect(element.props.children.props.children.props.children).toBe("content");
    expect(metadata).toEqual({ title: "KMA", description: "Audit management dashboard — KMA" });
  });
});
