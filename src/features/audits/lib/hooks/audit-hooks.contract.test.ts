import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
  listComments: vi.fn(),
  getAudit: vi.fn(),
  getReviewDetail: vi.fn(),
  pollReview: vi.fn(),
  completeReview: vi.fn(),
  createComment: vi.fn(),
  deleteAudit: vi.fn(),
  listAudits: vi.fn(),
  sendForReview: vi.fn(),
  updateAnswer: vi.fn(),
  updateComment: vi.fn(),
  updateFinding: vi.fn(),
  updateStatus: vi.fn(),
  useUsersQuery: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  keepPreviousData: Symbol("keepPreviousData"),
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock("@features/audits/lib/usecases/listAuditComments", () => ({ listAuditComments: mocks.listComments }));
vi.mock("@features/audits/lib/usecases/getAuditById", () => ({ default: mocks.getAudit }));
vi.mock("@features/audits/api/audit-review.repo.impl", () => ({ auditReviewDetailRepo: { getReviewDetail: mocks.getReviewDetail } }));
vi.mock("@features/audits/api/sendReview.repo.impl", () => ({ auditReviewRepo: { pollReview: mocks.pollReview } }));
vi.mock("@features/audits/lib/usecases/completeReviewAudit", () => ({ completeReviewAudit: mocks.completeReview }));
vi.mock("@features/audits/lib/usecases/createAuditComment", () => ({ createAuditComment: mocks.createComment }));
vi.mock("@features/audits/lib/usecases/deleteAudit", () => ({ default: mocks.deleteAudit }));
vi.mock("@features/audits/lib/usecases/listAudits", () => ({ default: mocks.listAudits }));
vi.mock("@features/audits/lib/usecases/send-for-review", () => ({ sendForReview: mocks.sendForReview }));
vi.mock("@features/audits/lib/usecases/updateAuditAnswer", () => ({ updateAuditAnswer: mocks.updateAnswer }));
vi.mock("@features/audits/lib/usecases/updateAuditComment", () => ({ updateAuditComment: mocks.updateComment }));
vi.mock("@features/audits/lib/usecases/updateAuditFinding", () => ({ updateAuditFinding: mocks.updateFinding }));
vi.mock("@features/audits/lib/usecases/updateAuditReviewStatus", () => ({ applyAuditEvent: mocks.updateStatus }));
vi.mock("@features/users/ui/hooks/useUsersQuery", () => ({ useUsersQuery: mocks.useUsersQuery }));

import { auditCommentsKey, useAuditComments } from "./useAuditComments";
import { auditDetailKey, useAuditDetail } from "./useAuditDetail";
import { auditReviewDetailKey, useAuditReviewDetail } from "./useAuditReviewDetail";
import useAuditors from "./useAuditors";
import { useCompleteReviewAuditMutation } from "./useCompleteReviewAuditMutation";
import { useCreateAuditCommentMutation } from "./useCreateAuditCommentMutation";
import useDeleteAudit from "./useDeleteAudit";
import useListAudits, { prefetchListAudits } from "./useListAudits";
import { usePollAuditReview } from "./usePoollAuditReview";
import { useSendForReviewMutation } from "./useSendForReview";
import useUpdateAuditAnswerMutation from "./useUpdateAuditAnswerMutation";
import { useUpdateAuditCommentMutation } from "./useUpdateAuditCommentMutation";
import useUpdateAuditFindingMutation from "./useUpdateAuditFindingMutation";
import useApplyAuditEvent from "./useUpdateAuditReviewStatus";

type QueryOptions = {
  queryKey: unknown;
  queryFn: () => unknown;
  enabled?: boolean;
  retry?: number | ((count: number) => boolean);
  refetchInterval?: (query: any) => number | false;
};
type MutationOptions = {
  mutationKey?: unknown;
  mutationFn: (variables: any) => unknown;
  onSuccess?: (data: any, variables: any) => unknown;
};
const query = () => mocks.useQuery.mock.calls.at(-1)?.[0] as QueryOptions;
const mutation = () => mocks.useMutation.mock.calls.at(-1)?.[0] as MutationOptions;

describe("audit query hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.invalidateQueries.mockResolvedValue(undefined);
  });

  it("builds stable detail and comment keys and honors enablement", async () => {
    useAuditComments("audit-1", { enabled: false });
    expect(auditCommentsKey("audit-1")).toEqual(["audits", "comments", "list", "audit-1"]);
    expect(query()).toMatchObject({ enabled: false, queryKey: auditCommentsKey("audit-1"), retry: 2 });
    await query().queryFn();
    expect(mocks.listComments).toHaveBeenCalledWith("audit-1");
    useAuditComments(undefined, { enabled: true });
    expect(query()).toMatchObject({ enabled: false, queryKey: auditCommentsKey("") });

    useAuditDetail("audit-1");
    expect(auditDetailKey("audit-1")).toEqual(["audits", "detail", "audit-1"]);
    await query().queryFn();
    expect(mocks.getAudit).toHaveBeenCalledWith("audit-1");
    useAuditDetail(undefined, { enabled: true });
    expect(query().enabled).toBe(false);

    useAuditReviewDetail("audit-1", { staleTime: 1 });
    expect(auditReviewDetailKey("audit-1")).toEqual(["audits", "review-detail", "audit-1"]);
    await query().queryFn();
    expect(mocks.getReviewDetail).toHaveBeenCalledWith("audit-1");
    useAuditReviewDetail();
    expect(query().enabled).toBe(false);
  });

  it("builds list filters, retry behavior and prefetch options", async () => {
    useListAudits({ status: "pending", auditor: "u1", last_eval_id: "cursor", limit: 10, enabled: false, staleTime: 7, gcTime: 8 });
    expect(query()).toMatchObject({
      enabled: false,
      queryKey: ["audits", "list", "pending", "u1", "cursor"],
    });
    await query().queryFn();
    expect(mocks.listAudits).toHaveBeenCalledWith({ params: { status: "pending", auditor: "u1", last_eval_id: "cursor", limit: 10 } });
    expect((query().retry as (count: number) => boolean)(1)).toBe(true);
    expect((query().retry as (count: number) => boolean)(2)).toBe(false);

    useListAudits();
    await query().queryFn();
    expect(mocks.listAudits).toHaveBeenLastCalledWith({ params: { limit: 200 } });

    const client = { prefetchQuery: vi.fn().mockResolvedValue(undefined) };
    await prefetchListAudits(client as any);
    const options = client.prefetchQuery.mock.calls[0]![0];
    await options.queryFn();
    expect(mocks.listAudits).toHaveBeenLastCalledWith();
  });

  it("maps named users into sorted auditor options", () => {
    mocks.useUsersQuery.mockReturnValue({
      data: { items: [
        { cognitoId: "2", name: "Zoe" },
        { cognitoId: "0", name: "" },
        { cognitoId: "1", name: "Alice" },
      ] },
      isLoading: true,
      isError: false,
    });
    expect(useAuditors()).toEqual({
      auditors: [{ id: "1", name: "Alice" }, { id: "2", name: "Zoe" }],
      isLoading: true,
      isError: false,
    });
    mocks.useUsersQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    expect(useAuditors().auditors).toEqual([]);
  });

  it("polls until either ready signal and supports continuous polling", async () => {
    usePollAuditReview({ auditReviewId: "review-1", enabled: true, refetchIntervalMs: 123 });
    expect(query()).toMatchObject({ enabled: true, queryKey: ["audits", "review", "review-1"] });
    await query().queryFn();
    expect(mocks.pollReview).toHaveBeenCalledWith("review-1");
    expect(query().refetchInterval?.({ state: {} })).toBe(123);
    expect(query().refetchInterval?.({ state: { data: { reviewReady: true } } })).toBe(false);
    expect(query().refetchInterval?.({ state: { data: { status: "draft_report_pending_review" } } })).toBe(false);

    usePollAuditReview({ stopWhenReady: false, options: { staleTime: 5 } });
    expect(query().enabled).toBe(false);
    expect(query().refetchInterval?.({ state: { data: { reviewReady: true } } })).toBe(5000);
  });
});

describe("audit mutation hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.invalidateQueries.mockResolvedValue(undefined);
  });

  it("sends and completes reviews", async () => {
    const customSuccess = vi.fn();
    useSendForReviewMutation({ onSuccess: customSuccess });
    await mutation().mutationFn({ auditId: "audit-1" });
    expect(mocks.sendForReview).toHaveBeenCalledWith("audit-1");
    mutation().onSuccess?.({}, {});
    expect(customSuccess).toHaveBeenCalled();

    useCompleteReviewAuditMutation();
    await mutation().mutationFn({ auditId: "audit-1" });
    await mutation().onSuccess?.({}, { auditId: "audit-1" });
    expect(mocks.completeReview).toHaveBeenCalledWith("audit-1");
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["audits", "detail"] });
  });

  it("creates, updates and invalidates audit comments", async () => {
    for (const [hook, operation, key] of [
      [useCreateAuditCommentMutation, mocks.createComment, "create"],
      [useUpdateAuditCommentMutation, mocks.updateComment, "update"],
    ] as const) {
      hook();
      expect(mutation().mutationKey).toEqual(["audits", "comments", key]);
      await mutation().mutationFn({ auditId: "audit-1", body: "note" });
      await mutation().onSuccess?.({}, { auditId: "audit-1" });
      expect(operation).toHaveBeenCalled();
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: auditCommentsKey("audit-1") });
    }
  });

  it("deletes audits and updates answers and findings", async () => {
    useDeleteAudit();
    await mutation().mutationFn("audit-1");
    await mutation().onSuccess?.({}, "audit-1");
    expect(mocks.deleteAudit).toHaveBeenCalledWith("audit-1");

    useUpdateAuditAnswerMutation();
    await mutation().mutationFn({ auditId: "audit-1", answer: "YES" });
    await mutation().onSuccess?.({}, { auditId: "audit-1" });
    expect(mocks.updateAnswer).toHaveBeenCalled();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: auditDetailKey("audit-1") });

    useUpdateAuditFindingMutation();
    await mutation().mutationFn({ auditId: "audit-1", quantity: 2 });
    await mutation().onSuccess?.({}, { auditId: "audit-1" });
    expect(mocks.updateFinding).toHaveBeenCalled();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: auditReviewDetailKey("audit-1") });
  });

  it("applies a workflow event and refreshes all dependent caches", async () => {
    useApplyAuditEvent();
    await mutation().mutationFn({ auditId: "audit-1", event: "open_review" });
    await mutation().onSuccess?.({}, { auditId: "audit-1" });
    expect(mocks.updateStatus).toHaveBeenCalled();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["audits", "list"] });
    expect(mocks.invalidateQueries).toHaveBeenCalledTimes(3);
  });
});
