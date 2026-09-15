// ---------------------------------------------------------------------------
// Tests for the useCreateAuditCommentMutation hook
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { AuditReviewComment } from "@entities/audit/model/comments";

const createAuditCommentMock = vi.fn();

vi.mock("@features/audits/lib/usecases/createAuditComment", () => ({
  createAuditComment: (...args: unknown[]) => createAuditCommentMock(...args),
  default: (...args: unknown[]) => createAuditCommentMock(...args),
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

import { useCreateAuditCommentMutation } from "../useCreateAuditCommentMutation";
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
    content: "Looks good",
    version: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useCreateAuditCommentMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the comment and invalidates only the comments list", async () => {
    const comment = makeComment();
    createAuditCommentMock.mockResolvedValue(comment);
    const { wrapper, invalidateQueries } = createWrapper();

    const { result } = renderHook(() => useCreateAuditCommentMutation(), {
      wrapper,
    });

    const input = {
      auditId: "audit-1",
      stepId: "step-1",
      content: "Looks good",
    };
    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(createAuditCommentMock).toHaveBeenCalledWith(input);
    expect(result.current.data).toEqual(comment);
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: auditCommentsKey("audit-1"),
    });
  });

  it("exposes the error and skips the invalidation", async () => {
    createAuditCommentMock.mockRejectedValue({
      code: "VALIDATION_ERROR",
      message: "content is required",
    });
    const { wrapper, invalidateQueries } = createWrapper();

    const { result } = renderHook(() => useCreateAuditCommentMutation(), {
      wrapper,
    });

    result.current.mutate({ auditId: "audit-1", stepId: "step-1", content: "" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
