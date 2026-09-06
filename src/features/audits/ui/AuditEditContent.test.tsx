import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditDetail } from "@entities/audit/model/audit-detail";
import type { AuditFinding } from "@entities/audit/model/audit-review";
import type { ReportJob } from "@entities/report/model/report-job";

const mocks = vi.hoisted(() => ({
  reviewDetail: undefined as any,
  reviewLoading: false,
  reviewError: false,
  refetchReview: vi.fn(),
  complete: vi.fn(),
  completePending: false,
  reportFetching: false,
  refetchReport: vi.fn(),
  getJob: vi.fn(),
  retryJob: vi.fn(),
}));

vi.mock("../lib/hooks/useAuditReviewDetail", () => ({
  useAuditReviewDetail: () => ({
    data: mocks.reviewDetail,
    isLoading: mocks.reviewLoading,
    isError: mocks.reviewError,
    refetch: mocks.refetchReview,
  }),
}));
vi.mock("../lib/hooks/useCompleteReviewAuditMutation", () => ({
  useCompleteReviewAuditMutation: () => ({
    mutateAsync: mocks.complete,
    isPending: mocks.completePending,
  }),
}));
vi.mock("@features/reports/lib/hooks/useAuditReport", () => ({
  useAuditReport: () => ({
    isFetching: mocks.reportFetching,
    refetch: mocks.refetchReport,
  }),
}));
vi.mock("@features/reports/api/report-job.repo.impl", () => ({
  reportJobRepo: { get: mocks.getJob, retry: mocks.retryJob },
}));

vi.mock("./AuditEditTabsBar", () => ({
  default: ({ activeTab, onChangeTab }: any) => (
    <div data-testid="active-tab" data-value={activeTab}>
      <button onClick={() => onChangeTab("questions")}>Questions tab</button>
      <button onClick={() => onChangeTab("report")}>Report tab</button>
    </div>
  ),
}));
vi.mock("./AuditQuestionsHeader", () => ({
  default: ({ filterMode, onFilterChange }: any) => (
    <div data-testid="questions-filter" data-value={filterMode}>
      <button onClick={() => onFilterChange("no")}>Only no</button>
    </div>
  ),
}));
vi.mock("./AuditQuestionsList", () => ({
  default: ({ auditId, items, filterMode, steps }: any) => (
    <div
      data-testid="questions-list"
      data-audit={auditId}
      data-count={items.length}
      data-filter={filterMode}
      data-steps={steps?.length ?? 0}
    />
  ),
}));
vi.mock("./FinalReportHeader", () => ({
  default: ({ onExport, disabled, exporting, rightAddon }: any) => (
    <div>
      <button onClick={onExport} disabled={disabled || exporting}>Export report</button>
      <span data-testid="export-state">{`${disabled}:${exporting}`}</span>
      {rightAddon}
    </div>
  ),
}));
vi.mock("./ReportItemsTable", () => ({
  default: ({ items, loading, error, onError, onAddComment, onEditFinding }: any) => (
    <div data-testid="report-items" data-count={items.length} data-loading={loading} data-error={error}>
      <button onClick={onError}>Reload findings</button>
      {items[0] ? (
        <>
          <button onClick={() => onAddComment(items[0], 0)}>Open comments</button>
          <button onClick={() => onEditFinding(items[0])}>Edit finding</button>
        </>
      ) : null}
    </div>
  ),
}));
vi.mock("./CommentsSidebar", () => ({
  default: ({ auditId, selected, onClose }: any) => (
    <aside data-testid="comments-sidebar" data-audit={auditId} data-target={selected.id}>
      {selected.title}
      <button onClick={onClose}>Close comments</button>
    </aside>
  ),
}));
vi.mock("./AuditFindingEditDialog", () => ({
  default: ({ open, onOpenChange, questionCode, defaultValues, expectedVersion }: any) => (
    <div
      data-testid="finding-dialog"
      data-open={open}
      data-code={questionCode}
      data-values={JSON.stringify(defaultValues)}
      data-version={expectedVersion ?? ""}
    >
      <button onClick={() => onOpenChange(false)}>Close finding</button>
    </div>
  ),
}));
vi.mock("@shared/ui/Loading", () => ({ Loading: () => <div>Loading audit</div> }));

import AuditEditContent from "./AuditEditContent";

const finding: AuditFinding = {
  questionCode: "Q-10",
  answer: "NO",
  barrierStatement: "Ramp is too steep",
  proposedMitigation: "Rebuild ramp",
  quantity: 2,
  cost: 10,
  totalCost: 20,
  notes: "Measured on site",
  photos: [],
  includeInReport: true,
};

const auditDetail = {
  id: "audit / 1",
  flowId: "flow-1",
  version: 7,
  projectId: "project-1",
  facilityId: "facility-1",
  status: "draft_report_in_review",
  auditDate: "2026-01-01",
  questions: [{ id: "Q1", type: "text", text: "Question", attachments: [] }],
  reportItems: [],
  comments: [],
  steps: [{ id: "Q1" }],
} as AuditDetail;

function job(overrides: Partial<ReportJob> = {}): ReportJob {
  return {
    jobId: "job-1",
    projectId: "project-1",
    triggerAuditId: "audit / 1",
    audits: [{ auditId: "audit / 1", auditVersion: 7, reviewVersion: 3 }],
    status: "queued",
    attempt: 1,
    reportKey: null,
    errorMessage: null,
    retryable: false,
    archivedAt: null,
    ...overrides,
  };
}

function renderContent(detail: AuditDetail | undefined = auditDetail) {
  return render(
    <AuditEditContent id="audit / 1" auditDetail={detail} />,
  );
}

describe("AuditEditContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.reviewLoading = false;
    mocks.reviewError = false;
    mocks.completePending = false;
    mocks.reportFetching = false;
    mocks.reviewDetail = {
      auditId: "audit / 1",
      version: 3,
      flowId: "flow-1",
      projectId: "project-1",
      status: "draft_report_in_review",
      findings: [finding],
      totalCost: 20,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    };
    mocks.refetchReview.mockResolvedValue({});
    mocks.complete.mockResolvedValue({ jobId: "job-1" });
    mocks.refetchReport.mockResolvedValue({ data: { reportUrl: "https://reports.example/job-1.pdf" } });
    mocks.getJob.mockResolvedValue(job({ status: "succeeded" }));
    mocks.retryJob.mockResolvedValue(job({ jobId: "job-2", status: "queued", attempt: 2 }));
    vi.spyOn(window, "open").mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("renders the loading state for either detail request", () => {
    mocks.reviewLoading = true;
    const { rerender } = renderContent();
    expect(screen.getByText("Loading audit")).toBeInTheDocument();
    mocks.reviewLoading = false;
    rerender(
      <AuditEditContent id="audit / 1" auditDetail={auditDetail} isAuditDetailLoading />,
    );
    expect(screen.getByText("Loading audit")).toBeInTheDocument();
  });

  it("renders questions and applies the selected answer filter", async () => {
    const user = userEvent.setup();
    renderContent();
    expect(screen.getByTestId("questions-list")).toHaveAttribute("data-count", "1");
    expect(screen.getByTestId("questions-list")).toHaveAttribute("data-steps", "1");
    await user.click(screen.getByRole("button", { name: "Only no" }));
    expect(screen.getByTestId("questions-filter")).toHaveAttribute("data-value", "no");
    expect(screen.getByTestId("questions-list")).toHaveAttribute("data-filter", "no");
  });

  it("opens comments, edits a finding and refreshes failed findings", async () => {
    const user = userEvent.setup();
    mocks.reviewError = true;
    renderContent();
    await user.click(screen.getByRole("button", { name: "Report tab" }));
    expect(screen.getByTestId("report-items")).toHaveAttribute("data-count", "1");
    expect(screen.getByTestId("report-items")).toHaveAttribute("data-error", "true");
    await user.click(screen.getByRole("button", { name: "Reload findings" }));
    expect(mocks.refetchReview).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Open comments" }));
    expect(screen.getByTestId("comments-sidebar")).toHaveAttribute("data-target", "Q-10");
    expect(screen.getByTestId("comments-sidebar")).toHaveTextContent("Ramp is too steep");
    await user.click(screen.getByRole("button", { name: "Close comments" }));
    expect(screen.queryByTestId("comments-sidebar")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit finding" }));
    expect(screen.getByTestId("finding-dialog")).toHaveAttribute("data-open", "true");
    expect(screen.getByTestId("finding-dialog")).toHaveAttribute("data-code", "Q-10");
    expect(screen.getByTestId("finding-dialog")).toHaveAttribute("data-version", "3");
    expect(screen.getByTestId("finding-dialog")).toHaveAttribute(
      "data-values",
      JSON.stringify({ quantity: 2, notes: "Measured on site" }),
    );
    await user.click(screen.getByRole("button", { name: "Close finding" }));
    expect(screen.getByTestId("finding-dialog")).toHaveAttribute("data-open", "false");
  });

  it("uses safe fallback comment and edit values for incomplete findings", async () => {
    const user = userEvent.setup();
    mocks.reviewDetail = {
      ...mocks.reviewDetail,
      version: 0,
      findings: [{ ...finding, questionCode: "", barrierStatement: null, proposedMitigation: null, quantity: Number.NaN, notes: null }],
    };
    renderContent();
    await user.click(screen.getByRole("button", { name: "Report tab" }));
    await user.click(screen.getByRole("button", { name: "Open comments" }));
    expect(screen.getByTestId("comments-sidebar")).toHaveAttribute("data-target", "report-item-1");
    expect(screen.getByTestId("comments-sidebar")).toHaveTextContent("Item 1");
    await user.click(screen.getByRole("button", { name: "Edit finding" }));
    expect(screen.getByTestId("finding-dialog")).toHaveAttribute(
      "data-values",
      JSON.stringify({ quantity: null, notes: null }),
    );
    expect(screen.getByTestId("finding-dialog")).toHaveAttribute("data-version", "");
  });

  it("generates a report and navigates an available popup to the PDF", async () => {
    const user = userEvent.setup();
    const popup = {
      closed: false,
      close: vi.fn(),
      opener: window,
      location: { href: "about:blank" },
      document: { title: "", body: { innerHTML: "" } },
    };
    vi.mocked(window.open).mockReturnValue(popup as unknown as Window);
    renderContent();
    await user.click(screen.getByRole("button", { name: "Report tab" }));
    await user.click(screen.getByRole("button", { name: "Export report" }));
    await waitFor(() => expect(mocks.getJob).toHaveBeenCalledWith("job-1", expect.any(AbortSignal)));
    expect(mocks.complete).toHaveBeenCalledWith({ auditId: "audit / 1" });
    expect(mocks.refetchReview).toHaveBeenCalled();
    expect(popup.document.title).toBe("Generating PDF...");
    expect(popup.location.href).toBe("https://reports.example/job-1.pdf");
    expect(popup.opener).toBeNull();
    expect(localStorage.getItem("report-job:audit / 1")).toBeNull();
  });

  it("offers an explicit download when the popup is blocked", async () => {
    const user = userEvent.setup();
    renderContent();
    await user.click(screen.getByRole("button", { name: "Report tab" }));
    await user.click(screen.getByRole("button", { name: "Export report" }));
    const link = await screen.findByRole("link", { name: "Download PDF" });
    expect(link).toHaveAttribute("href", "https://reports.example/job-1.pdf");
    expect(screen.getByRole("status")).toHaveTextContent("Your PDF is ready");
    expect(screen.getByText(/audit \/ 1 \(audit v7, review v3\)/)).toBeInTheDocument();
  });

  it("shows a failed job and recovers it through Retry", async () => {
    const user = userEvent.setup();
    mocks.getJob
      .mockResolvedValueOnce(job({ status: "failed", errorMessage: "PDF crashed", retryable: true }))
      .mockResolvedValueOnce(job({ jobId: "job-2", status: "succeeded", attempt: 2 }));
    renderContent();
    await user.click(screen.getByRole("button", { name: "Report tab" }));
    await user.click(screen.getByRole("button", { name: "Export report" }));
    expect(await screen.findByRole("status")).toHaveTextContent("PDF crashed");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByRole("link", { name: "Download PDF" });
    expect(mocks.retryJob).toHaveBeenCalledWith("job-1");
    expect(mocks.getJob).toHaveBeenLastCalledWith("job-2", expect.any(AbortSignal));
  });

  it("surfaces export, polling and retry errors instead of rejecting silently", async () => {
    const user = userEvent.setup();
    mocks.complete.mockRejectedValueOnce(new Error("Approval conflict"));
    renderContent();
    await user.click(screen.getByRole("button", { name: "Report tab" }));
    await user.click(screen.getByRole("button", { name: "Export report" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Approval conflict");

    mocks.complete.mockResolvedValueOnce({ jobId: "job-network" });
    mocks.getJob.mockRejectedValueOnce(new Error("Job endpoint unavailable"));
    await user.click(screen.getByRole("button", { name: "Export report" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Job endpoint unavailable");

    mocks.getJob.mockResolvedValueOnce(job({ status: "failed", retryable: true }));
    await user.click(screen.getByRole("button", { name: "Export report" }));
    await screen.findByRole("button", { name: "Retry" });
    mocks.retryJob.mockRejectedValueOnce(new Error("Retry unavailable"));
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Retry unavailable");
  });

  it("explains when a successful job has no available PDF", async () => {
    const user = userEvent.setup();
    mocks.refetchReport.mockResolvedValue({ data: {} });
    renderContent();
    await user.click(screen.getByRole("button", { name: "Report tab" }));
    await user.click(screen.getByRole("button", { name: "Export report" }));
    expect(await screen.findByRole("status")).toHaveTextContent("PDF is unavailable");
  });

  it("resumes a stored job and reports lookup failures", async () => {
    localStorage.setItem("report-job:audit / 1", "stored-job");
    mocks.getJob.mockRejectedValue(new Error("Cannot resume job"));
    renderContent();
    await userEvent.setup().click(screen.getByRole("button", { name: "Report tab" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Cannot resume job");
    expect(mocks.getJob).toHaveBeenCalledWith("stored-job", expect.any(AbortSignal));
  });

  it("polls exactly sixty times before exposing the resumable timeout", async () => {
    vi.useFakeTimers();
    mocks.getJob.mockResolvedValue(job({ status: "running" }));
    renderContent();
    fireEvent.click(screen.getByRole("button", { name: "Report tab" }));
    fireEvent.click(screen.getByRole("button", { name: "Export report" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    expect(mocks.getJob).toHaveBeenCalledTimes(60);
    expect(screen.getByRole("status")).toHaveTextContent("Generation is still pending");
  });

  it("reopens completed reviews with version control and displays API failures", async () => {
    const user = userEvent.setup();
    mocks.reviewDetail = { ...mocks.reviewDetail, status: "completed" };
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("Fix measurements");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({}) })
      .mockResolvedValueOnce({ ok: false, json: vi.fn().mockResolvedValue({ message: "Version conflict" }) });
    vi.stubGlobal("fetch", fetchMock);
    renderContent();
    await user.click(screen.getByRole("button", { name: "Report tab" }));
    expect(screen.getByRole("button", { name: "Export report" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Reopen review" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audits-review/audit%20%2F%201/reopen",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ reason: "Fix measurements", expected_version: 7 }),
      }),
    );
    expect(mocks.refetchReview).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Reopen review" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Version conflict");
    prompt.mockReturnValue("   ");
    await user.click(screen.getByRole("button", { name: "Reopen review" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("disables export without findings, in another state, or while work is active", async () => {
    const user = userEvent.setup();
    mocks.reviewDetail = { ...mocks.reviewDetail, findings: [] };
    const { rerender } = renderContent(undefined);
    await user.click(screen.getByRole("button", { name: "Report tab" }));
    expect(screen.getByRole("button", { name: "Export report" })).toBeDisabled();

    mocks.reviewDetail = { ...mocks.reviewDetail, findings: [finding], status: "audit_review" };
    rerender(<AuditEditContent id="audit / 1" auditDetail={auditDetail} />);
    expect(screen.getByRole("button", { name: "Export report" })).toBeDisabled();

    mocks.reviewDetail = { ...mocks.reviewDetail, status: "draft_report_in_review" };
    mocks.reportFetching = true;
    rerender(<AuditEditContent id="audit / 1" auditDetail={auditDetail} />);
    expect(screen.getByRole("button", { name: "Export report" })).toBeDisabled();
  });
});
