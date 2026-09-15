// ---------------------------------------------------------------------------
// Tests for the useUpdateAuditAnswerMutation hook
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { AuditAnswerUpdateResult } from "@entities/audit/model/audit-review-answer-update";

const updateAuditAnswerMock = vi.fn();

vi.mock("@features/audits/lib/usecases/updateAuditAnswer", () => ({
  updateAuditAnswer: (...args: unknown[]) => updateAuditAnswerMock(...args),
}));

// La factoría de claves vive junto a useAuditReviewDetail, que arrastra el
// repositorio HTTP real: se neutraliza para no cargar la configuración de env.
vi.mock("@features/audits/api/audit-review.repo.impl", () => ({
  auditReviewDetailRepo: {
    getReviewDetail: vi.fn(),
    completeReview: vi.fn(),
    updateStatus: vi.fn(),
    updateFinding: vi.fn(),
  },
}));

// Ídem para useAuditDetail, que importa el caso de uso getAuditById.
vi.mock("@features/audits/api/audit.repo.impl", () => ({
  default: { getById: vi.fn(), list: vi.fn(), delete: vi.fn() },
}));

import { useUpdateAuditAnswerMutation } from "../useUpdateAuditAnswerMutation";
import { auditReviewDetailKey } from "../useAuditReviewDetail";
import { auditDetailKey } from "../useAuditDetail";

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

function makeResult(): AuditAnswerUpdateResult {
  return { audit_id: "audit-1", status: "updated", message: "ok" };
}

const input = {
  auditId: "audit-1",
  answers: [{ step_id: "step-1", type: "Question", answer: "YES" }],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useUpdateAuditAnswerMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the answers and returns the result", async () => {
    const expected = makeResult();
    updateAuditAnswerMock.mockResolvedValue(expected);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateAuditAnswerMutation(), {
      wrapper,
    });

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateAuditAnswerMock).toHaveBeenCalledWith(input);
    expect(result.current.data).toEqual(expected);
  });

  it("invalidates the review detail and the audit detail", async () => {
    updateAuditAnswerMock.mockResolvedValue(makeResult());
    const { wrapper, invalidateQueries } = createWrapper();

    const { result } = renderHook(() => useUpdateAuditAnswerMutation(), {
      wrapper,
    });

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: auditReviewDetailKey("audit-1"),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: auditDetailKey("audit-1"),
    });
    expect(invalidateQueries).toHaveBeenCalledTimes(2);
  });

  it("exposes the error and skips the invalidation", async () => {
    updateAuditAnswerMock.mockRejectedValue({
      code: "SERVER_ERROR",
      message: "Failed to update answers",
    });
    const { wrapper, invalidateQueries } = createWrapper();

    const { result } = renderHook(() => useUpdateAuditAnswerMutation(), {
      wrapper,
    });

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: "SERVER_ERROR" });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
