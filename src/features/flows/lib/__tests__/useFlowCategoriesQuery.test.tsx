import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";

const { listMock, createMock, updateMock, deleteMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("@features/flows/api/flow-categories.repo.impl", () => ({
  flowCategoriesRepo: {
    list: listMock,
    create: createMock,
    update: updateMock,
    delete: deleteMock,
  },
}));

vi.mock("@shared/config/env", () => ({
  PublicEnv: { queryStaleTimeMs: 30_000 },
}));

import {
  flowCategoriesKeys,
  useCreateFlowCategory,
  useDeleteFlowCategory,
  useFlowCategoriesQuery,
  useUpdateFlowCategory,
} from "../useFlowCategoriesQuery";
import { FlowsApiError } from "@features/flows/api/flows.repo.impl";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retryDelay: 0 },
      mutations: { retry: false },
    },
  });
  const invalidateSpy = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidateSpy };
}

describe("useFlowCategoriesQuery and mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches categories when enabled", async () => {
    listMock.mockResolvedValueOnce({
      categories: [{ id: "cat-1", name: "Ramps", isActive: true }],
      total: 1,
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFlowCategoriesQuery(true, { active: true }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listMock).toHaveBeenCalledWith({ active: true });
    expect(result.current.data?.categories).toHaveLength(1);
  });

  it("stops retrying on 401 errors", async () => {
    listMock.mockRejectedValue(new FlowsApiError("Unauthorized", 401));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFlowCategoriesQuery(true), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it("invalidates categories cache on create, update, and delete", async () => {
    createMock.mockResolvedValueOnce({ id: "cat-2", name: "Doors", isActive: true });
    updateMock.mockResolvedValueOnce({ id: "cat-2", name: "Doors 2", isActive: false });
    deleteMock.mockResolvedValueOnce(undefined);
    const { wrapper, invalidateSpy } = createWrapper();

    const createHook = renderHook(() => useCreateFlowCategory(), { wrapper });
    await act(async () => {
      await createHook.result.current.mutateAsync({ name: "Doors" });
    });

    const updateHook = renderHook(() => useUpdateFlowCategory(), { wrapper });
    await act(async () => {
      await updateHook.result.current.mutateAsync({
        id: "cat-2",
        input: { name: "Doors 2", isActive: false },
      });
    });

    const deleteHook = renderHook(() => useDeleteFlowCategory(), { wrapper });
    await act(async () => {
      await deleteHook.result.current.mutateAsync({ id: "cat-2", permanent: true });
    });

    expect(invalidateSpy).toHaveBeenCalledTimes(3);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: flowCategoriesKeys.all });
  });
});
