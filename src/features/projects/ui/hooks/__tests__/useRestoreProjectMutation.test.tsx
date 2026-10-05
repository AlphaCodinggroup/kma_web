// ---------------------------------------------------------------------------
// Tests for the useRestoreProjectMutation hook
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { Project } from "@entities/projects/model";

const restoreUseCaseMock = vi.fn();

vi.mock("@features/projects/lib/usecases/restore-project", () => ({
  restoreProjectUseCase: (...args: unknown[]) => restoreUseCaseMock(...args),
}));

import { useRestoreProjectMutation } from "../useRestoreProjectMutation";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { invalidate, wrapper };
}

const restored: Project = {
  id: "project-1",
  name: "Project 1",
  status: "ACTIVE",
  users: [],
  facilities: [],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
  createdBy: "user-1",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useRestoreProjectMutation", () => {
  it("restores the project and refreshes every projects query", async () => {
    restoreUseCaseMock.mockResolvedValue(restored);
    const { invalidate, wrapper } = createWrapper();
    const { result } = renderHook(() => useRestoreProjectMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: "project-1" });
    });

    expect(restoreUseCaseMock).toHaveBeenCalledWith({ id: "project-1" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["projects"] });
  });

  it("does not refresh the lists when the restore fails", async () => {
    restoreUseCaseMock.mockRejectedValue({ code: "NOT_FOUND", message: "nope" });
    const { invalidate, wrapper } = createWrapper();
    const { result } = renderHook(() => useRestoreProjectMutation(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ id: "project-1" })).rejects.toEqual({
        code: "NOT_FOUND",
        message: "nope",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
  });
});
