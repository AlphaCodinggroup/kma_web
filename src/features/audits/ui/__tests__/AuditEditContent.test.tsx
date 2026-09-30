/**
 * Contenido de la pantalla de edición de auditoría: pestañas, filtro de
 * preguntas, panel de comentarios y el reporte con formato PDF: edición en el
 * lugar, cambios sin guardar, aprobación y descarga.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { AuditDetail } from "@entities/audit/model/audit-detail";
import type { AuditFinding, AuditReviewDetail } from "@entities/audit/model/audit-review";
import type { ExportProgress } from "@entities/report/model/export-progress";

// ---- mocks ----

const reviewDetailState = {
  data: undefined as AuditReviewDetail | undefined,
  isLoading: false,
  isError: false,
};
const refetchReviewDetail = vi.fn();
vi.mock("@features/audits/lib/hooks/useAuditReviewDetail", () => ({
  useAuditReviewDetail: () => ({
    data: reviewDetailState.data,
    isLoading: reviewDetailState.isLoading,
    isError: reviewDetailState.isError,
    refetch: refetchReviewDetail,
  }),
}));

const session = { isAdmin: true };
vi.mock("@processes/auth/hooks", () => ({
  useSession: () => session,
}));

const draftsState = {
  isDirty: false,
  hasErrors: false,
  isSaving: false,
  saveError: null as string | null,
};
const saveDrafts = vi.fn();
const discardDrafts = vi.fn();
vi.mock("@features/audits/lib/hooks/useReportDrafts", () => ({
  useReportDrafts: () => ({
    ...draftsState,
    draftOf: () => ({ quantity: "", notes: "" }),
    setDraft: vi.fn(),
    errorOf: () => null,
    costOf: () => 0,
    save: saveDrafts,
    discard: discardDrafts,
  }),
}));

const startApprove = vi.fn();
const exportOptionsSpy = vi.fn();
const approveState: {
  isBusy: boolean;
  isOpen: boolean;
  progress: ExportProgress;
} = {
  isBusy: false,
  isOpen: false,
  progress: { phase: "idle", percent: null, message: "", bytes: null, error: null },
};
vi.mock("@features/audits/lib/hooks/useExportAuditReport", () => ({
  useExportAuditReport: (_id: string, options: unknown) => {
    exportOptionsSpy(options);
    return {
      ...approveState,
      filename: "report.pdf",
      start: startApprove,
      retry: vi.fn(),
      stopWaiting: vi.fn(),
      close: vi.fn(),
    };
  },
}));

const reportState = {
  data: undefined as { id: string; reportName: string | null; reportUrl: string | null } | undefined,
};
const auditReportOptionsSpy = vi.fn();
vi.mock("@features/reports/lib/hooks/useAuditReport", () => ({
  useAuditReport: (_id: string, options: unknown) => {
    auditReportOptionsSpy(options);
    return { data: reportState.data };
  },
}));

const download = vi.fn();
const downloadState = { activeId: null as string | null };
vi.mock("@features/reports/lib/hooks/useDownloadReportFile", () => ({
  useDownloadReportFile: () => ({ download, activeId: downloadState.activeId }),
}));

vi.mock("@features/audits/ui/ExportReportModal", () => ({
  __esModule: true,
  default: (props: { open: boolean; activeTitle?: string; showFilename?: boolean }) => (
    <div data-testid="approve-modal">
      {String(props.open)} {props.activeTitle} {String(props.showFilename)}
    </div>
  ),
}));

// Los hijos pesados se reducen a stubs que exponen sus props: cada uno tiene su
// propio archivo de tests.
vi.mock("@features/audits/ui/AuditQuestionsList", () => ({
  __esModule: true,
  default: ({
    auditId,
    steps,
    items,
    filterMode,
  }: {
    auditId?: string;
    steps?: unknown[];
    items: unknown[];
    filterMode?: string;
  }) => (
    <div data-testid="questions-list">
      <span data-testid="questions-audit-id">{auditId}</span>
      <span data-testid="questions-steps">{steps?.length ?? "none"}</span>
      <span data-testid="questions-count">{items.length}</span>
      <span data-testid="questions-filter">{filterMode}</span>
    </div>
  ),
}));

vi.mock("@features/audits/ui/ReportPreview", () => ({
  __esModule: true,
  default: ({
    findings,
    facilityName,
    location,
    editable,
    canComment,
    onAddComment,
  }: {
    findings: AuditFinding[];
    facilityName: string;
    location?: string | null;
    editable: boolean;
    canComment: boolean;
    onAddComment: (row: AuditFinding, index: number) => void;
  }) => (
    <div data-testid="report-preview">
      <span data-testid="preview-count">{findings.length}</span>
      <span data-testid="preview-facility">{facilityName}</span>
      <span data-testid="preview-location">{location ?? "none"}</span>
      <span data-testid="preview-editable">{String(editable)}</span>
      <span data-testid="preview-can-comment">{String(canComment)}</span>
      {findings.map((item, index) => (
        <button key={index} onClick={() => onAddComment(item, index)}>
          comment {index}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@features/audits/ui/CommentsSidebar", () => ({
  __esModule: true,
  default: ({
    auditId,
    selected,
    onClose,
  }: {
    auditId: string;
    selected?: { id: string; title: string };
    onClose?: () => void;
  }) => (
    <aside data-testid="comments-sidebar">
      <span data-testid="sidebar-audit-id">{auditId}</span>
      <span data-testid="sidebar-id">{selected?.id}</span>
      <span data-testid="sidebar-title">{selected?.title}</span>
      <button onClick={onClose}>close sidebar</button>
    </aside>
  ),
}));

// ---- import after mocks ----
import AuditEditContent, { type AuditEditContentProps } from "../AuditEditContent";

const makeFinding = (overrides: Partial<AuditFinding> = {}): AuditFinding => ({
  questionCode: "Q-1",
  answer: "NO",
  mitigationId: "MIT-1",
  barrierStatement: "Ramp slope over the limit",
  proposedMitigation: "Rebuild the ramp",
  adasReference: "ADA 405.2",
  quantity: 2,
  unitCost: 100,
  unitOfMeasure: "EA",
  measurements: [],
  notes: "Measured at 10%",
  photos: [],
  calculatedCost: 200,
  ...overrides,
});

const makeReviewDetail = (
  overrides: Partial<AuditReviewDetail> = {}
): AuditReviewDetail => ({
  auditId: "audit-1",
  flowId: "flow-1",
  projectId: "project-1",
  status: "draft_report_in_review",
  findings: [makeFinding()],
  totalCost: 200,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
  ...overrides,
});

const makeAuditDetail = (
  overrides: Partial<AuditDetail> = {}
): AuditDetail => ({
  id: "audit-1",
  flowId: "flow-1",
  version: 1,
  projectId: "project-1",
  facilityId: "facility-1",
  facilityName: "House 2",
  location: "North entrance",
  status: "draft_report_in_review",
  auditDate: "2026-01-01T00:00:00Z",
  questions: [
    { id: "q1", type: "yes_no", text: "Is it compliant?", attachments: [] },
    { id: "q2", type: "text", text: "Observations", attachments: [] },
  ],
  reportItems: [],
  comments: [],
  steps: [{ id: "q1" }, { id: "f1" }],
  ...overrides,
});

let queryClient: QueryClient;

function renderContent(props: Partial<AuditEditContentProps> = {}) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(
    <AuditEditContent id="audit-1" auditDetail={makeAuditDetail()} {...props} />,
    { wrapper }
  );
}

async function openReportTab(props: Partial<AuditEditContentProps> = {}) {
  const utils = renderContent(props);
  const user = userEvent.setup();
  await user.click(screen.getByRole("tab", { name: "Report" }));
  return { ...utils, user };
}

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient();
  vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined);
  vi.stubGlobal("alert", vi.fn());
  reviewDetailState.data = makeReviewDetail();
  reviewDetailState.isLoading = false;
  reviewDetailState.isError = false;
  session.isAdmin = true;
  draftsState.isDirty = false;
  draftsState.hasErrors = false;
  draftsState.isSaving = false;
  draftsState.saveError = null;
  approveState.isBusy = false;
  approveState.isOpen = false;
  approveState.progress = { phase: "idle", percent: null, message: "", bytes: null, error: null };
  reportState.data = undefined;
  downloadState.activeId = null;
});

describe("AuditEditContent — loading", () => {
  it("shows the loading overlay while the review detail loads", () => {
    reviewDetailState.isLoading = true;
    const { container } = renderContent();

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByTestId("audit-edit-content")).not.toBeInTheDocument();
  });

  it("shows the loading overlay while the audit detail loads", () => {
    const { container } = renderContent({ auditDetail: undefined, isAuditDetailLoading: true });

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });
});

describe("AuditEditContent — questions tab", () => {
  it("renders the questions tab by default", () => {
    renderContent();

    expect(screen.getByTestId("questions-count")).toHaveTextContent("2");
    expect(screen.getByTestId("questions-audit-id")).toHaveTextContent("audit-1");
    expect(screen.getByTestId("questions-steps")).toHaveTextContent("2");
    expect(screen.queryByTestId("report-preview")).not.toBeInTheDocument();
  });

  it("forwards the picked filter to the question list", async () => {
    renderContent();

    await userEvent.selectOptions(screen.getByLabelText("Filter questions"), "unsure");

    expect(screen.getByTestId("questions-filter")).toHaveTextContent("unsure");
  });
});

describe("AuditEditContent — report preview", () => {
  it("shows the findings of the review with the facility and location of the audit", async () => {
    await openReportTab();

    expect(screen.getByRole("heading", { name: "Draft Report" })).toBeInTheDocument();
    expect(screen.getByTestId("preview-count")).toHaveTextContent("1");
    expect(screen.getByTestId("preview-facility")).toHaveTextContent("House 2");
    expect(screen.getByTestId("preview-location")).toHaveTextContent("North entrance");
  });

  it("names a facility placeholder without audit detail", async () => {
    await openReportTab({ auditDetail: undefined });

    expect(screen.getByTestId("preview-facility")).toHaveTextContent("Facility");
  });

  it.each([
    ["an admin with the audit in review", true, "draft_report_in_review", "true"],
    ["an admin with the audit pending review", true, "draft_report_pending_review", "false"],
    ["an admin with the audit completed", true, "completed", "false"],
    ["another role", false, "draft_report_in_review", "false"],
  ] as const)("edits in place only for %s", async (_label, isAdmin, status, expected) => {
    session.isAdmin = isAdmin;
    reviewDetailState.data = makeReviewDetail({ status });

    await openReportTab();

    expect(screen.getByTestId("preview-editable")).toHaveTextContent(expected);
  });

  it("offers a retry when the report fails to load", async () => {
    reviewDetailState.isError = true;
    const { user } = await openReportTab();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(refetchReviewDetail).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("report-preview")).not.toBeInTheDocument();
  });

  it("tells the page whether there are unsaved changes", async () => {
    const onDirtyChange = vi.fn();
    draftsState.isDirty = true;

    renderContent({ onDirtyChange });

    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });
});

describe("AuditEditContent — comments", () => {
  it("opens the comments sidebar with the question code and the barrier statement", async () => {
    const { user } = await openReportTab();

    await user.click(screen.getByRole("button", { name: "comment 0" }));

    expect(screen.getByTestId("sidebar-audit-id")).toHaveTextContent("audit-1");
    expect(screen.getByTestId("sidebar-id")).toHaveTextContent("Q-1");
    expect(screen.getByTestId("sidebar-title")).toHaveTextContent("Ramp slope over the limit");
  });

  it("closes the comments sidebar", async () => {
    const { user } = await openReportTab();

    await user.click(screen.getByRole("button", { name: "comment 0" }));
    await user.click(screen.getByRole("button", { name: "close sidebar" }));

    expect(screen.queryByTestId("comments-sidebar")).not.toBeInTheDocument();
  });

  it.each([
    ["the mitigation", { questionCode: undefined as unknown as string, barrierStatement: null }, "report-item-1", "Rebuild the ramp"],
    ["Item N", { barrierStatement: null, proposedMitigation: null }, "Q-1", "Item 1"],
  ])("falls back to %s as the comment title", async (_label, overrides, id, title) => {
    reviewDetailState.data = makeReviewDetail({ findings: [makeFinding(overrides)] });
    const { user } = await openReportTab();

    await user.click(screen.getByRole("button", { name: "comment 0" }));

    expect(screen.getByTestId("sidebar-id")).toHaveTextContent(id);
    expect(screen.getByTestId("sidebar-title")).toHaveTextContent(title);
  });
});

describe("AuditEditContent — save, approve and download", () => {
  it("saves and discards the drafts from the banner", async () => {
    draftsState.isDirty = true;
    const { user } = await openReportTab();

    expect(screen.getByText("Changes detected — save to continue")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Discard" }));

    expect(saveDrafts).toHaveBeenCalledTimes(1);
    expect(discardDrafts).toHaveBeenCalledTimes(1);
  });

  it("approves without downloading", async () => {
    const { user } = await openReportTab();

    expect(exportOptionsSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ downloadWhenReady: false })
    );
    await user.click(screen.getByRole("button", { name: "Approve" }));

    expect(startApprove).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("approve-modal")).toHaveTextContent("Approving report false");
  });

  it("refreshes the review after queueing the approval", async () => {
    await openReportTab();

    const [options] = exportOptionsSpy.mock.lastCall as [{ onQueued: () => Promise<void> }];
    await options.onQueued();

    expect(refetchReviewDetail).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["the audit is not in review", { status: "completed" as const }],
    ["there are no findings", { findings: [] }],
  ])("does not approve when %s", async (_label, overrides) => {
    reviewDetailState.data = makeReviewDetail(overrides);

    await openReportTab();

    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
  });

  it("does not approve while there are unsaved changes", async () => {
    draftsState.isDirty = true;

    await openReportTab();

    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
  });

  it("keeps Return disabled until the backend supports it", async () => {
    await openReportTab();

    expect(screen.getByRole("button", { name: "Return" })).toBeDisabled();
  });

  it("reloads the audit, the review and the report once approved", async () => {
    approveState.progress = { ...approveState.progress, phase: "done" };

    await openReportTab();

    expect(refetchReviewDetail).toHaveBeenCalled();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["audits", "detail", "audit-1"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["reports", "by-audit", "audit-1"],
    });
    expect(auditReportOptionsSpy).toHaveBeenLastCalledWith({ enabled: true });
  });

  it.each([
    ["in review", "draft_report_in_review", false],
    ["sent to the client", "final_report_sent_to_client", true],
    ["completed", "completed", true],
  ] as const)("looks for the report only once it exists (%s)", async (_label, status, enabled) => {
    reviewDetailState.data = makeReviewDetail({ status });

    await openReportTab();

    expect(auditReportOptionsSpy).toHaveBeenLastCalledWith({ enabled });
  });

  it("downloads the report of the project", async () => {
    const report = { id: "audit-1", reportName: "Boston", reportUrl: "https://cdn/r.pdf" };
    reportState.data = report;
    reviewDetailState.data = makeReviewDetail({ status: "completed" });
    download.mockResolvedValue({});
    const { user } = await openReportTab();

    await user.click(screen.getByRole("button", { name: "Download" }));

    expect(download).toHaveBeenCalledWith(report);
  });

  it("warns when the download fails", async () => {
    reportState.data = { id: "audit-1", reportName: "Boston", reportUrl: "https://cdn/r.pdf" };
    reviewDetailState.data = makeReviewDetail({ status: "completed" });
    download.mockRejectedValue(new Error("network"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { user } = await openReportTab();

    await user.click(screen.getByRole("button", { name: "Download" }));

    await vi.waitFor(() =>
      expect(alert).toHaveBeenCalledWith("Error downloading the report. Please try again.")
    );
  });

  it("does not download without a report url", async () => {
    reportState.data = { id: "audit-1", reportName: "Boston", reportUrl: null };

    await openReportTab();

    expect(screen.getByRole("button", { name: "Download" })).toBeDisabled();
  });

  it("shows the download in progress", async () => {
    reportState.data = { id: "audit-1", reportName: "Boston", reportUrl: "https://cdn/r.pdf" };
    downloadState.activeId = "audit-1";

    await openReportTab();

    expect(screen.getByRole("button", { name: "Download" })).toBeDisabled();
  });
});
