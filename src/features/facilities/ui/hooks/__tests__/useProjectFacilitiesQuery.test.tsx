// ---------------------------------------------------------------------------
// Tests for the useProjectFacilitiesQuery hook
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ProjectFacility } from "@entities/facility/model";

const { repo } = vi.hoisted(() => ({ repo: { getByProject: vi.fn() } }));

vi.mock("@features/facilities/api/facilities.repo.impl", () => ({
  facilitiesRepoImpl: repo,
}));

import {
  useProjectFacilitiesQuery,
  projectFacilitiesQueryKey,
} from "../useProjectFacilitiesQuery";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retryDelay: 0 } },
  });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { client, wrapper };
}

const facilities: ProjectFacility[] = [
  { id: "f-1", projectId: "p-1", name: "HQ", city: "Boston" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("projectFacilitiesQueryKey", () => {
  it("hangs from the projects prefix so project mutations refresh it", () => {
    expect(projectFacilitiesQueryKey("p-1")).toEqual([
      "projects",
      "detail",
      "p-1",
      "facilities",
    ]);
  });
});

describe("useProjectFacilitiesQuery", () => {
  it("loads the facilities of the project", async () => {
    repo.getByProject.mockResolvedValueOnce(facilities);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useProjectFacilitiesQuery("p-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(repo.getByProject).toHaveBeenCalledWith("p-1");
    expect(result.current.data).toEqual(facilities);
  });

  it("does not query without a project id", () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useProjectFacilitiesQuery(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(repo.getByProject).not.toHaveBeenCalled();
  });

  it("reports the error after the retries", async () => {
    repo.getByProject.mockRejectedValue({ code: "SERVER_ERROR", message: "boom" });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useProjectFacilitiesQuery("p-1"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(repo.getByProject).toHaveBeenCalledTimes(3);
  });
});
