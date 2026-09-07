// ---------------------------------------------------------------------------
// Tests for the useAuditors hook (derives auditor options from the users query)
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { UsersListResult } from "@entities/user/list.model";

const useUsersQueryMock = vi.fn();

vi.mock("@features/users/ui/hooks/useUsersQuery", () => ({
  useUsersQuery: (...args: unknown[]) => useUsersQueryMock(...args),
}));

import { useAuditors } from "../useAuditors";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resultado parcial de useQuery: sólo los campos que consume el hook. */
function queryResult(
  data: UsersListResult | undefined,
  overrides: { isLoading?: boolean; isError?: boolean } = {}
) {
  return {
    data,
    isLoading: overrides.isLoading ?? false,
    isError: overrides.isError ?? false,
  };
}

function makeUsers(): UsersListResult {
  return {
    items: [
      {
        id: "1",
        cognitoId: "cognito-charlie",
        name: "Charlie",
        email: "charlie@test.com",
        role: "auditor",
      },
      {
        id: "2",
        cognitoId: "cognito-alice",
        name: "Alice",
        email: "alice@test.com",
        role: "auditor",
      },
      {
        id: "3",
        cognitoId: "cognito-bob",
        name: "Bob",
        email: "bob@test.com",
        role: "admin",
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useAuditors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps users to auditor options sorted by name", () => {
    useUsersQueryMock.mockReturnValue(queryResult(makeUsers()));

    const { result } = renderHook(() => useAuditors());

    expect(result.current.auditors).toEqual([
      { id: "cognito-alice", name: "Alice" },
      { id: "cognito-bob", name: "Bob" },
      { id: "cognito-charlie", name: "Charlie" },
    ]);
  });

  it("filters out users without a name", () => {
    useUsersQueryMock.mockReturnValue(
      queryResult({
        items: [
          {
            id: "1",
            cognitoId: "cognito-1",
            name: "",
            email: "a@test.com",
            role: "auditor",
          },
          {
            id: "2",
            cognitoId: "cognito-2",
            name: "Alice",
            email: "b@test.com",
            role: "auditor",
          },
        ],
      })
    );

    const { result } = renderHook(() => useAuditors());

    expect(result.current.auditors).toEqual([
      { id: "cognito-2", name: "Alice" },
    ]);
  });

  it.each([
    ["the query is still loading", undefined, { isLoading: true }],
    ["the query failed", undefined, { isError: true }],
  ])("returns an empty list when %s", (_label, data, flags) => {
    useUsersQueryMock.mockReturnValue(queryResult(data, flags));

    const { result } = renderHook(() => useAuditors());

    expect(result.current.auditors).toEqual([]);
  });

  it("forwards the loading and error flags", () => {
    useUsersQueryMock.mockReturnValue(
      queryResult(undefined, { isLoading: true, isError: false })
    );

    const { result } = renderHook(() => useAuditors());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it("calls the users query without filters", () => {
    useUsersQueryMock.mockReturnValue(queryResult(makeUsers()));

    renderHook(() => useAuditors());

    expect(useUsersQueryMock).toHaveBeenCalledWith();
  });
});
