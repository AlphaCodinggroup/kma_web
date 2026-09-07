// ---------------------------------------------------------------------------
// Tests for the useAuditComments query hook
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { AuditCommentsList } from "@entities/audit/model/comments";

const listAuditCommentsMock = vi.fn();

vi.mock("@features/audits/lib/usecases/listAuditComments", () => ({
  listAuditComments: (...args: unknown[]) => listAuditCommentsMock(...args),
  default: (...args: unknown[]) => listAuditCommentsMock(...args),
}));

import { useAuditComments, auditCommentsKey } from "../useAuditComments";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Cliente aislado por test: sin reintentos ni backoff. */
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

function makeList(): AuditCommentsList {
  return {
    comments: [
      {
        id: "comment-1",
        auditId: "audit-1",
        stepId: "step-1",
        userId: "user-1",
        content: "Looks good",
        version: 1,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("auditCommentsKey", () => {
  it("builds a stable cache key", () => {
    expect(auditCommentsKey("audit-1")).toEqual([
      "audits",
      "comments",
      "list",
      "audit-1",
    ]);
  });
});

describe("useAuditComments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in a loading state and then resolves with the comments", async () => {
    const list = makeList();
    listAuditCommentsMock.mockResolvedValue(list);
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useAuditComments("audit-1", { retry: false }),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(list);
    expect(listAuditCommentsMock).toHaveBeenCalledWith("audit-1");
  });

  it("exposes the use case error", async () => {
    listAuditCommentsMock.mockRejectedValue({
      code: "SERVER_ERROR",
      message: "boom",
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useAuditComments("audit-1", { retry: false }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: "SERVER_ERROR" });
  });

  it.each([
    ["there is no audit id", undefined],
    ["the audit id is empty", ""],
  ])("stays disabled when %s", async (_label, auditId) => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuditComments(auditId), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(listAuditCommentsMock).not.toHaveBeenCalled();
  });

  it("honours an explicit enabled: false", async () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useAuditComments("audit-1", { enabled: false }),
      { wrapper }
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(listAuditCommentsMock).not.toHaveBeenCalled();
  });

  it("caches the result under the audit comments key", async () => {
    const list = makeList();
    listAuditCommentsMock.mockResolvedValue(list);
    const { client, wrapper } = createWrapper();

    const { result } = renderHook(
      () => useAuditComments("audit-1", { retry: false }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData(auditCommentsKey("audit-1"))).toEqual(list);
  });
});
