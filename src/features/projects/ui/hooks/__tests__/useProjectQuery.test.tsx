// ---------------------------------------------------------------------------
// Tests for the useProjectQuery hook
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { Project } from "@entities/projects/model";

const getProjectByIdMock = vi.fn();

// vi.mock se eleva al inicio del archivo: el repo tiene que existir antes.
const { repo } = vi.hoisted(() => ({ repo: { name: "projects-repo" } }));

vi.mock("@features/projects/lib/usecases/get-project", () => ({
  getProjectById: (...args: unknown[]) => getProjectByIdMock(...args),
}));
vi.mock("@features/projects/api/projects.repo.impl", () => ({
  projectsRepoImpl: repo,
}));

import { useProjectQuery, projectDetailQueryKey } from "../useProjectQuery";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retryDelay: 0 } },
  });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { client, wrapper };
}

const project: Project = {
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

describe("projectDetailQueryKey", () => {
  it("shares the projects prefix so list mutations refresh it", () => {
    expect(projectDetailQueryKey("project-1")).toEqual([
      "projects",
      "detail",
      "project-1",
    ]);
  });
});

describe("useProjectQuery", () => {
  it("loads the project and caches it under its key", async () => {
    getProjectByIdMock.mockResolvedValue(project);
    const { client, wrapper } = createWrapper();

    const { result } = renderHook(() => useProjectQuery("project-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(project);
    expect(getProjectByIdMock).toHaveBeenCalledWith(repo, "project-1");
    expect(client.getQueryData(projectDetailQueryKey("project-1"))).toBe(project);
  });

  it.each([undefined, ""])("does not fetch without an id (%j)", (id) => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useProjectQuery(id), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(getProjectByIdMock).not.toHaveBeenCalled();
  });

  it.each(["NOT_FOUND", "UNAUTHORIZED"])(
    "does not retry a %s error",
    async (code) => {
      getProjectByIdMock.mockRejectedValue({ code, message: code });
      const { wrapper } = createWrapper();

      const { result } = renderHook(() => useProjectQuery("project-1"), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(getProjectByIdMock).toHaveBeenCalledTimes(1);
    }
  );

  it("retries other errors twice before failing", async () => {
    getProjectByIdMock.mockRejectedValue(new Error("boom"));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useProjectQuery("project-1"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getProjectByIdMock).toHaveBeenCalledTimes(3);
  });
});
