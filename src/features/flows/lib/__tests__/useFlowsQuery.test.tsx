// ---------------------------------------------------------------------------
// Tests for the flows query hooks (useFlowsQuery / useFlowById)
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { Flow, FlowList } from "@entities/flow/model";

// ---------------------------------------------------------------------------
// Mocks: el repositorio HTTP y la configuración pública de entorno.
// ---------------------------------------------------------------------------

// `vi.hoisted` es necesario porque las factorías de `vi.mock` se elevan por
// encima de las declaraciones del archivo.
const { FlowsApiErrorMock, listMock, getByIdMock } = vi.hoisted(() => {
  /** Réplica del error de dominio: el hook usa `instanceof` para cortar reintentos. */
  class FlowsApiErrorMock extends Error {
    status?: number;
    constructor(message: string, status?: number) {
      super(message);
      this.name = "FlowsApiError";
      if (typeof status === "number") {
        this.status = status;
      }
    }
  }

  return { FlowsApiErrorMock, listMock: vi.fn(), getByIdMock: vi.fn() };
});

vi.mock("@features/flows/api/flows.repo.impl", () => ({
  FlowsApiError: FlowsApiErrorMock,
  flowsRepo: {
    list: (...args: unknown[]) => listMock(...args),
    getById: (...args: unknown[]) => getByIdMock(...args),
  },
}));

vi.mock("@shared/config/env", () => ({
  PublicEnv: { queryStaleTimeMs: 30_000 },
}));

import { useFlowsQuery, useFlowById, flowsKeys } from "../useFlowsQuery";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0 },
      mutations: { retry: false },
    },
  });

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return { client, wrapper };
}

function makeFlow(overrides: Partial<Flow> = {}): Flow {
  return {
    id: "flow-1",
    title: "Ramps",
    steps: [],
    version: 1,
    ...overrides,
  };
}

function makeList(overrides: Partial<FlowList> = {}): FlowList {
  return { flows: [makeFlow()], total: 1, limit: 10, offset: 0, ...overrides };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("flowsKeys", () => {
  it("builds stable cache keys", () => {
    expect(flowsKeys.all).toEqual(["flows"]);
    expect(flowsKeys.list()).toEqual(["flows", "list"]);
    expect(flowsKeys.detail("flow-1")).toEqual(["flows", "detail", "flow-1"]);
  });
});

describe("useFlowsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts loading and then resolves with the flow list", async () => {
    const list = makeList();
    listMock.mockResolvedValue(list);
    const { client, wrapper } = createWrapper();

    const { result } = renderHook(() => useFlowsQuery(true), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(list);
    expect(client.getQueryData(flowsKeys.list())).toEqual(list);
  });

  it("stays disabled when enabled is false", () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFlowsQuery(false), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(listMock).not.toHaveBeenCalled();
  });

  it("does not retry on a 401", async () => {
    listMock.mockRejectedValue(new FlowsApiErrorMock("unauthorized", 401));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFlowsQuery(true), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(result.current.error?.status).toBe(401);
  });

  it("retries twice on any other failure", async () => {
    listMock.mockRejectedValue(new FlowsApiErrorMock("server down", 500));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFlowsQuery(true), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 3000,
    });
    expect(listMock).toHaveBeenCalledTimes(3);
  });
});

describe("useFlowById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves with the flow and exposes the query metadata", async () => {
    const flow = makeFlow();
    getByIdMock.mockResolvedValue(flow);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFlowById("flow-1"), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.flow).toEqual(flow));
    expect(getByIdMock).toHaveBeenCalledWith("flow-1");
    expect(result.current.isFetching).toBe(false);
    expect(result.current.isRefetching).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.refetch).toBe("function");
    expect(result.current.dataUpdatedAt).toBeGreaterThan(0);
  });

  it.each([
    ["there is no flow id", undefined, true],
    ["the caller disabled it", "flow-1", false],
  ])("stays disabled when %s", (_label, flowId, enabled) => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFlowById(flowId, enabled), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(false);
    expect(getByIdMock).not.toHaveBeenCalled();
  });

  it("does not retry on a 401", async () => {
    getByIdMock.mockRejectedValue(new FlowsApiErrorMock("unauthorized", 401));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFlowById("flow-1"), { wrapper });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(getByIdMock).toHaveBeenCalledTimes(1);
  });

  it("retries twice on any other failure", async () => {
    getByIdMock.mockRejectedValue(new Error("network"));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFlowById("flow-1"), { wrapper });

    await waitFor(() => expect(result.current.error).not.toBeNull(), {
      timeout: 3000,
    });
    expect(getByIdMock).toHaveBeenCalledTimes(3);
  });
});
