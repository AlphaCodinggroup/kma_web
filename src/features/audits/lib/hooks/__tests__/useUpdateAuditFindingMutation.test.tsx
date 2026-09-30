// ---------------------------------------------------------------------------
// Tests for the useUpdateAuditFindingMutation hook
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { AuditFindingUpdateResult } from "@entities/audit/model/audit-review-finding-update";

const updateAuditFindingMock = vi.fn();

vi.mock("@features/audits/lib/usecases/updateAuditFinding", () => ({
  updateAuditFinding: (...args: unknown[]) => updateAuditFindingMock(...args),
  default: (...args: unknown[]) => updateAuditFindingMock(...args),
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

import { useUpdateAuditFindingMutation } from "../useUpdateAuditFindingMutation";
import { auditReviewDetailKey } from "../useAuditReviewDetail";

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

function makeResult(): AuditFindingUpdateResult {
  return {
    auditId: "audit-1",
    questionCode: "Q-1",
    status: "updated",
    message: "ok",
  };
}

const input = { auditId: "audit-1", questionCode: "Q-1", quantity: 3 };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useUpdateAuditFindingMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the finding and invalidates the review detail", async () => {
    const expected = makeResult();
    updateAuditFindingMock.mockResolvedValue(expected);
    const { wrapper, invalidateQueries } = createWrapper();

    const { result } = renderHook(() => useUpdateAuditFindingMutation(), {
      wrapper,
    });

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateAuditFindingMock).toHaveBeenCalledWith(input);
    expect(result.current.data).toEqual(expected);
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: auditReviewDetailKey("audit-1"),
    });
  });

  it("exposes the error and skips the invalidation", async () => {
    updateAuditFindingMock.mockRejectedValue({
      code: "BAD_REQUEST",
      message: "quantity must be a finite number",
    });
    const { wrapper, invalidateQueries } = createWrapper();

    const { result } = renderHook(() => useUpdateAuditFindingMutation(), {
      wrapper,
    });

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: "BAD_REQUEST" });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
