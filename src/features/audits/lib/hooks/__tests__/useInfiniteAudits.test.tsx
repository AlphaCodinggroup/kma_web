import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Audit } from "@entities/audit/model";
import { useInfiniteAudits } from "../useInfiniteAudits";

const listAudits = vi.hoisted(() => vi.fn());
vi.mock("@features/audits/lib/usecases/listAudits", () => ({ default: listAudits }));

function Wrapper({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const row = { id: "audit-1" } as Audit;

describe("useInfiniteAudits", () => {
  beforeEach(() => { vi.clearAllMocks(); listAudits.mockReset(); });

  it("follows the existing cursor while preserving server filters", async () => {
    listAudits
      .mockResolvedValueOnce({ audits: [row], total: 2, last_eval_id: "cursor-1" })
      .mockResolvedValueOnce({ audits: [{ id: "audit-2" }], total: 2 });
    const { result } = renderHook(() => useInfiniteAudits({ status: "draft_report_in_review", auditor: "jane", projectId: "project-1" }), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
    await act(async () => { await result.current.fetchNextPage(); });
    expect(listAudits).toHaveBeenNthCalledWith(2, {
      params: { limit: 100, status: "draft_report_in_review", auditor: "jane", project_id: "project-1", last_eval_id: "cursor-1" },
    });
    await waitFor(() => expect(result.current.data?.pages.flatMap(page => page.audits).map(audit => audit.id)).toEqual(["audit-1", "audit-2"]));
    expect(result.current.hasNextPage).toBe(false);
  });

  it("resets accumulated pages when the server filter changes", async () => {
    listAudits.mockResolvedValue({ audits: [row], total: 1 });
    const { result, rerender } = renderHook(({ status }) => useInfiniteAudits({ status }), { wrapper: Wrapper, initialProps: { status: "completed" } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    listAudits.mockResolvedValue({ audits: [{ id: "other" }], total: 1 });
    rerender({ status: "draft_report_pending_review" });
    await waitFor(() => expect(result.current.data?.pages[0]?.audits[0]?.id).toBe("other"));
    expect(result.current.data?.pages).toHaveLength(1);
  });

  it("keeps loaded data when loading the next page fails", async () => {
    listAudits.mockResolvedValueOnce({ audits: [row], total: 2, last_eval_id: "cursor" }).mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => {
      const query = useInfiniteAudits();
      // El componente real lee este estado durante el render para mostrar el error.
      void query.isFetchNextPageError;
      return query;
    }, { wrapper: Wrapper });
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    await act(async () => { await result.current.fetchNextPage(); });
    await waitFor(() => expect(result.current.isFetchNextPageError).toBe(true));
    expect(result.current.data?.pages[0]?.audits).toEqual([row]);
  });
  it("retains both cursor pages when a background refresh fails", async () => {
    listAudits
      .mockResolvedValueOnce({ audits: [row], total: 2, last_eval_id: "cursor-1" })
      .mockResolvedValueOnce({ audits: [{ id: "audit-2" }], total: 2 });
    const { result } = renderHook(() => {
      const query = useInfiniteAudits();
      void query.data;
      void query.isRefetchError;
      void query.isFetchNextPageError;
      return query;
    }, { wrapper: Wrapper });
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    await act(async () => { await result.current.fetchNextPage(); });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    listAudits.mockRejectedValue(new Error("offline"));
    await act(async () => { await result.current.refetch(); });
    await waitFor(() => expect(result.current.isRefetchError).toBe(true));
    expect(result.current.isFetchNextPageError).toBe(false);
    expect(result.current.data?.pages.flatMap(page => page.audits).map(audit => audit.id)).toEqual(["audit-1", "audit-2"]);
  });

});
