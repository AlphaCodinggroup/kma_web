// ---------------------------------------------------------------------------
// Tests for the useUpdateAuditCommentMutation hook
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { AuditReviewComment } from "@entities/audit/model/comments";

const updateAuditCommentMock = vi.fn();

vi.mock("@features/audits/lib/usecases/updateAuditComment", () => ({
  updateAuditComment: (...args: unknown[]) => updateAuditCommentMock(...args),
  default: (...args: unknown[]) => updateAuditCommentMock(...args),
}));

// Las factorías de claves viven junto a useAuditComments, que arrastra el
// repositorio HTTP real: se neutraliza para no cargar la configuración de env.
vi.mock("@features/audits/api/audit-comments.repo.impl", () => ({
  auditCommentsRepo: {
    createComment: vi.fn(),
    updateComment: vi.fn(),
    listByAudit: vi.fn(),
  },
}));

import { useUpdateAuditCommentMutation } from "../useUpdateAuditCommentMutation";
import { auditCommentsKey } from "../useAuditComments";

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
  const invalidateQueries = vi.spyOn(client, "invalidateQueries");

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return { client, wrapper, invalidateQueries };
}

function makeComment(): AuditReviewComment {
  return {
    id: "comment-1",
    auditId: "audit-1",
    stepId: "step-1",
    userId: "user-1",
    content: "Edited",
    version: 2,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useUpdateAuditCommentMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the comment and invalidates only the comments list", async () => {
    const comment = makeComment();
    updateAuditCommentMock.mockResolvedValue(comment);
    const { wrapper, invalidateQueries } = createWrapper();

    const { result } = renderHook(() => useUpdateAuditCommentMutation(), {
      wrapper,
    });

    const input = {
      commentId: "comment-1",
      auditId: "audit-1",
      stepId: "step-1",
      content: "Edited",
    };
    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateAuditCommentMock).toHaveBeenCalledWith(input);
    expect(result.current.data).toEqual(comment);
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: auditCommentsKey("audit-1"),
    });
  });

  it("exposes the error and skips the invalidation", async () => {
    updateAuditCommentMock.mockRejectedValue({
      code: "CONFLICT",
      message: "stale version",
    });
    const { wrapper, invalidateQueries } = createWrapper();

    const { result } = renderHook(() => useUpdateAuditCommentMutation(), {
      wrapper,
    });

    result.current.mutate({
      commentId: "comment-1",
      auditId: "audit-1",
      stepId: "step-1",
      content: "Edited",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: "CONFLICT" });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
