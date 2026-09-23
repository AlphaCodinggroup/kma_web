/**
 * Abrir la revisión (QC) de una auditoría: aviso si es conforme, envío a
 * revisión si es un borrador pendiente, y navegación directa en el resto,
 * llevando el destino de vuelta cuando se pide.
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Audit } from "@entities/audit/model";

const push = vi.fn();
const startSendForReview = vi.fn();
const useSendForReviewAudit = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));
vi.mock("@features/audits/lib/hooks/useSendForReviewAudit", () => ({
  useSendForReviewAudit: (...args: unknown[]) => useSendForReviewAudit(...args),
}));

import { useOpenAuditReview } from "../useOpenAuditReview";

const makeAudit = (overrides: Partial<Audit> = {}): Audit => ({
  id: "audit-1",
  flowId: "flow-1",
  version: 1,
  projectId: "project-1",
  facilityId: "facility-1",
  status: "draft_report_in_review",
  createdBy: "creator",
  updatedBy: null,
  createdAt: "2026-01-15T10:30:00Z",
  updatedAt: "2026-01-16T10:30:00Z",
  projectName: null,
  auditorName: "jane",
  facilityName: null,
  findingsCount: 2,
  ...overrides,
});

function stubSend(sendResult: unknown = undefined) {
  useSendForReviewAudit.mockReturnValue({ start: startSendForReview, sendResult });
}

beforeEach(() => {
  vi.clearAllMocks();
  stubSend();
});

describe("useOpenAuditReview", () => {
  it("polls the review every five seconds until it is ready", () => {
    renderHook(() => useOpenAuditReview());

    expect(useSendForReviewAudit).toHaveBeenCalledWith(
      expect.objectContaining({ refetchIntervalMs: 5000, stopWhenReady: true })
    );
  });

  it("forwards the ready notification", () => {
    const onReady = vi.fn();
    renderHook(() => useOpenAuditReview({ onReady }));

    const [{ onReady: forwarded }] = useSendForReviewAudit.mock.calls[0] as [
      { onReady: () => void },
    ];
    forwarded();

    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it("opens the edit page carrying the auditor", () => {
    const { result } = renderHook(() => useOpenAuditReview());

    act(() => result.current.openReview(makeAudit()));

    expect(push).toHaveBeenCalledWith("/audits/audit-1/edit?auditor=jane");
    expect(result.current.editingId).toBe("audit-1");
  });

  it("falls back to the creator when the audit has no auditor", () => {
    const { result } = renderHook(() => useOpenAuditReview());

    act(() => result.current.openReview(makeAudit({ auditorName: null })));

    expect(push).toHaveBeenCalledWith("/audits/audit-1/edit?auditor=creator");
  });

  it("carries the return path to the edit page", () => {
    const { result } = renderHook(() =>
      useOpenAuditReview({ returnTo: "/projects/project-1" })
    );

    act(() => result.current.openReview(makeAudit()));

    expect(push).toHaveBeenCalledWith(
      "/audits/audit-1/edit?auditor=jane&returnTo=%2Fprojects%2Fproject-1"
    );
  });

  it("shows the no report notice for a compliant audit without navigating", () => {
    const { result } = renderHook(() => useOpenAuditReview());

    act(() => result.current.openReview(makeAudit(), true));

    expect(result.current.noReportNeeded.open).toBe(true);
    expect(push).not.toHaveBeenCalled();

    act(() => result.current.noReportNeeded.onOpenChange(false));
    expect(result.current.noReportNeeded.open).toBe(false);
  });

  it("sends a pending draft for review before navigating", () => {
    const { result } = renderHook(() => useOpenAuditReview());

    act(() =>
      result.current.openReview(makeAudit({ status: "draft_report_pending_review" }))
    );

    expect(startSendForReview).toHaveBeenCalledWith("audit-1");
    expect(push).not.toHaveBeenCalled();
    expect(result.current.editingId).toBe("audit-1");
  });

  it("navigates once the send for review resolves, keeping the return path", async () => {
    const { result, rerender } = renderHook(() =>
      useOpenAuditReview({ returnTo: "/projects/project-1" })
    );
    act(() =>
      result.current.openReview(makeAudit({ status: "draft_report_pending_review" }))
    );

    stubSend({ auditReviewId: "review-1" });
    rerender();

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        "/audits/audit-1/edit?returnTo=%2Fprojects%2Fproject-1"
      )
    );
    expect(push).toHaveBeenCalledTimes(1);
  });
});
