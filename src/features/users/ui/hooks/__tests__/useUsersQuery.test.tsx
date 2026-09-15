// ---------------------------------------------------------------------------
// Tests for the useUsersQuery hook (consumed by the audits feature)
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { UsersListResult } from "@entities/user/list.model";

const getUsersMock = vi.fn();

vi.mock("@features/users/api/users.repo.impl", () => ({
  usersRepoImpl: {
    getUsers: (...args: unknown[]) => getUsersMock(...args),
  },
  UsersRepoHttp: class {},
}));

import { useUsersQuery } from "../useUsersQuery";

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

function makeUsers(): UsersListResult {
  return {
    items: [
      {
        id: "1",
        cognitoId: "cognito-1",
        name: "Jane Doe",
        email: "jane@test.com",
        role: "auditor",
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useUsersQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts loading and then resolves with the users", async () => {
    const users = makeUsers();
    getUsersMock.mockResolvedValue(users);
    const { client, wrapper } = createWrapper();

    const { result } = renderHook(() => useUsersQuery(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(users);
    expect(getUsersMock).toHaveBeenCalledWith(undefined);
    expect(client.getQueryData(["users", undefined])).toEqual(users);
  });

  it("keys the cache by filters and forwards them to the repository", async () => {
    getUsersMock.mockResolvedValue(makeUsers());
    const { client, wrapper } = createWrapper();

    const { result } = renderHook(() => useUsersQuery({ role: "auditor" }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getUsersMock).toHaveBeenCalledWith({ role: "auditor" });
    expect(client.getQueryData(["users", { role: "auditor" }])).toBeDefined();
  });

  it("stays disabled when enabled is false", () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useUsersQuery(undefined, false), {
      wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(getUsersMock).not.toHaveBeenCalled();
  });

  it("retries twice and then exposes the repository error", async () => {
    getUsersMock.mockRejectedValue(new Error("server down"));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useUsersQuery(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 3000,
    });
    expect(getUsersMock).toHaveBeenCalledTimes(3);
    expect(result.current.error?.message).toBe("server down");
  });
});
