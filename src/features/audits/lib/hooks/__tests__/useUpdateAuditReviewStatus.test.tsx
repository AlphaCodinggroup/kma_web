// ---------------------------------------------------------------------------
// Tests for the useUpdateAuditReviewStatus mutation hook
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { AuditReviewStatusChange } from "@entities/audit/model/audit-review-status";

const updateAuditReviewStatusMock = vi.fn();

vi.mock("@features/audits/lib/usecases/updateAuditReviewStatus", () => ({
  updateAuditReviewStatus: (...args: unknown[]) =>
    updateAuditReviewStatusMock(...args),
  default: (...args: unknown[]) => updateAuditReviewStatusMock(...args),
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

import { useUpdateAuditReviewStatus } from "../useUpdateAuditReviewStatus";
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

function makeChange(): AuditReviewStatusChange {
  return {
    auditId: "audit-1",
    oldStatus: "draft_report_pending_review",
    newStatus: "draft_report_in_review",
    message: "Status updated",
  };
}

const input = {
  auditId: "audit-1",
  status: "draft_report_in_review",
} as const;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useUpdateAuditReviewStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the status and returns the change", async () => {
    const expected = makeChange();
    updateAuditReviewStatusMock.mockResolvedValue(expected);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateAuditReviewStatus(), {
      wrapper,
    });

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateAuditReviewStatusMock).toHaveBeenCalledWith(input);
    expect(result.current.data).toEqual(expected);
  });

  it("invalidates the review detail, the audit detail and the list", async () => {
    updateAuditReviewStatusMock.mockResolvedValue(makeChange());
    const { wrapper, invalidateQueries } = createWrapper();

    const { result } = renderHook(() => useUpdateAuditReviewStatus(), {
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
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["audits", "list"],
    });
    expect(invalidateQueries).toHaveBeenCalledTimes(3);
  });

  it("exposes the error and skips the invalidation", async () => {
    updateAuditReviewStatusMock.mockRejectedValue({
      code: "FORBIDDEN",
      message: "not allowed",
    });
    const { wrapper, invalidateQueries } = createWrapper();

    const { result } = renderHook(() => useUpdateAuditReviewStatus(), {
      wrapper,
    });

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: "FORBIDDEN" });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
