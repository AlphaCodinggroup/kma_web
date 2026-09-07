/**
 * Contenido de la pantalla de edición de auditoría: pestañas, filtro de
 * preguntas, cambio de estado, panel de comentarios, diálogo de hallazgo y el
 * flujo de exportación del reporte final.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

const startExport = vi.fn();
const retryExport = vi.fn();
const stopExport = vi.fn();
const closeExport = vi.fn();
const exportState: {
  isBusy: boolean;
  isOpen: boolean;
  filename: string;
  progress: ExportProgress;
} = {
  isBusy: false,
  isOpen: false,
  filename: "report.pdf",
  progress: {
    phase: "idle" as const,
    percent: null as number | null,
    message: "",
    bytes: null,
    error: null,
  },
};
vi.mock("@features/audits/lib/hooks/useExportAuditReport", () => ({
  useExportAuditReport: () => ({
    ...exportState,
    start: startExport,
    retry: retryExport,
    stopWaiting: stopExport,
    close: closeExport,
  }),
}));

vi.mock("@features/audits/ui/ExportReportModal", () => ({
  __esModule: true,
  default: ({
    open,
    progress,
    filename,
    onStop,
    onRetry,
    onClose,
  }: {
    open: boolean;
    progress: { message: string };
    filename: string;
    onStop: () => void;
    onRetry: () => void;
    onClose: () => void;
  }) => (
    <div data-testid="export-modal">
      <span>{String(open)}</span>
      <span>{progress.message}</span>
      <span>{filename}</span>
      <button onClick={onStop}>stop export</button>
      <button onClick={onRetry}>retry export</button>
      <button onClick={onClose}>close export</button>
    </div>
  ),
}));

const mutateStatus = vi.fn();
const statusState = { isPending: false };
vi.mock("@features/audits/lib/hooks/useUpdateAuditReviewStatus", () => ({
  useUpdateAuditReviewStatus: () => ({
    mutate: mutateStatus,
    isPending: statusState.isPending,
  }),
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

vi.mock("@features/audits/ui/ReportItemsTable", () => ({
  __esModule: true,
  default: ({
    items,
    loading,
    error,
    onError,
    onAddComment,
    onEditFinding,
  }: {
    items: AuditFinding[];
    loading?: boolean;
    error?: boolean;
    onError?: () => void;
    onAddComment: (row: AuditFinding, index: number) => void;
    onEditFinding?: (row: AuditFinding, index: number) => void;
  }) => (
    <div data-testid="report-items">
      <span data-testid="report-count">{items.length}</span>
      <span data-testid="report-loading">{String(Boolean(loading))}</span>
      <span data-testid="report-error">{String(Boolean(error))}</span>
      <button onClick={onError}>table retry</button>
      {items.map((item, index) => (
        <div key={index}>
          <button onClick={() => onAddComment(item, index)}>
            comment {index}
          </button>
          <button onClick={() => onEditFinding?.(item, index)}>
            edit {index}
          </button>
        </div>
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

vi.mock("@features/audits/ui/AuditFindingEditDialog", () => ({
  __esModule: true,
  default: ({
    open,
    onOpenChange,
    auditId,
    questionCode,
    defaultValues,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    auditId: string;
    questionCode?: string | null;
    defaultValues?: { quantity: number | null; notes: string | null };
  }) => (
    <div data-testid="finding-dialog">
      <span data-testid="dialog-open">{String(open)}</span>
      <span data-testid="dialog-audit-id">{auditId}</span>
      <span data-testid="dialog-code">{questionCode}</span>
      <span data-testid="dialog-quantity">
        {String(defaultValues?.quantity)}
      </span>
      <span data-testid="dialog-notes">{String(defaultValues?.notes)}</span>
      <button onClick={() => onOpenChange(false)}>close dialog</button>
    </div>
  ),
}));

// ---- import after mocks ----
import AuditEditContent from "../AuditEditContent";

const makeFinding = (overrides: Partial<AuditFinding> = {}): AuditFinding => ({
  questionCode: "Q-1",
  answer: "NO",
  barrierStatement: "Ramp slope over the limit",
  proposedMitigation: "Rebuild the ramp",
  adasReference: "ADA 405.2",
  quantity: 2,
  cost: 100,
  unit: "ea",
  totalCost: 200,
  notes: "Measured at 10%",
  photos: [],
  includeInReport: true,
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

beforeEach(() => {
  vi.clearAllMocks();
  reviewDetailState.data = makeReviewDetail();
  reviewDetailState.isLoading = false;
  reviewDetailState.isError = false;
  exportState.isBusy = false;
  exportState.isOpen = false;
  exportState.filename = "report.pdf";
  exportState.progress = {
    phase: "idle",
    percent: null,
    message: "",
    bytes: null,
    error: null,
  };
  statusState.isPending = false;
  refetchReviewDetail.mockResolvedValue({ data: reviewDetailState.data });

  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * Abre la pestaña de reporte, montando el componente si el caso no lo hizo.
 *
 * Algunos casos renderizan con props propias antes de llamar al helper y otros
 * se apoyan sólo en él; sin este monte perezoso, esos últimos fallaban con el
 * body vacío.
 */
const openReportTab = async () => {
  const user = userEvent.setup();
  if (!screen.queryByTestId("audit-edit-content")) {
    render(<AuditEditContent id="audit-1" auditDetail={makeAuditDetail()} />);
  }
  await user.click(screen.getByRole("tab", { name: "Report" }));
  return user;
};

describe("AuditEditContent — loading", () => {
  it("shows the loading overlay while the review detail loads", () => {
    reviewDetailState.isLoading = true;
    const { container } = render(
      <AuditEditContent id="audit-1" auditDetail={makeAuditDetail()} />
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByTestId("audit-edit-content")).not.toBeInTheDocument();
  });

  it("shows the loading overlay while the audit detail loads", () => {
    const { container } = render(
      <AuditEditContent id="audit-1" auditDetail={undefined} isAuditDetailLoading />
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });
});

describe("AuditEditContent — questions tab", () => {
  it("renders the questions tab by default", () => {
    render(<AuditEditContent id="audit-1" auditDetail={makeAuditDetail()} />);

    expect(screen.getByTestId("audit-edit-content")).toBeInTheDocument();
    expect(screen.getByTestId("questions-count")).toHaveTextContent("2");
    expect(screen.getByTestId("questions-audit-id")).toHaveTextContent(
      "audit-1"
    );
    expect(screen.getByTestId("questions-steps")).toHaveTextContent("2");
    expect(screen.getByTestId("questions-filter")).toHaveTextContent("all");
    expect(screen.getByText("All Answers")).toBeInTheDocument();
  });

  it("renders an empty question list when there is no audit detail", () => {
    render(<AuditEditContent id="audit-1" auditDetail={undefined} />);

    expect(screen.getByTestId("questions-count")).toHaveTextContent("0");
    expect(screen.getByTestId("questions-steps")).toHaveTextContent("none");
  });

  it("forwards the picked filter to the question list", async () => {
    const user = userEvent.setup();
    render(<AuditEditContent id="audit-1" auditDetail={makeAuditDetail()} />);

    await user.selectOptions(
      screen.getByLabelText("Filter questions"),
      "unsure"
    );

    expect(screen.getByTestId("questions-filter")).toHaveTextContent("unsure");
  });

  it("switches to the report tab and back to the questions tab", async () => {
    const user = await openReportTab();

    expect(screen.getByTestId("report-items")).toBeInTheDocument();
    expect(screen.queryByTestId("questions-list")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Questions & Answers" }));

    expect(screen.getByTestId("questions-list")).toBeInTheDocument();
  });
});

describe("AuditEditContent — report tab", () => {
  beforeEach(() => {
    render(<AuditEditContent id="audit-1" auditDetail={makeAuditDetail()} />);
  });

  it("renders the findings table with the review findings", async () => {
    await openReportTab();

    expect(screen.getByTestId("report-count")).toHaveTextContent("1");
    expect(screen.getByTestId("report-loading")).toHaveTextContent("false");
    expect(screen.getByTestId("report-error")).toHaveTextContent("false");
    expect(screen.getByText("Draft Report")).toBeInTheDocument();
  });

  it("wires the table retry to the review detail refetch", async () => {
    const user = await openReportTab();

    await user.click(screen.getByRole("button", { name: "table retry" }));

    expect(refetchReviewDetail).toHaveBeenCalledTimes(1);
  });

  it("opens the comments sidebar with the question code and the barrier statement", async () => {
    const user = await openReportTab();

    await user.click(screen.getByRole("button", { name: "comment 0" }));

    expect(screen.getByTestId("sidebar-audit-id")).toHaveTextContent("audit-1");
    expect(screen.getByTestId("sidebar-id")).toHaveTextContent("Q-1");
    expect(screen.getByTestId("sidebar-title")).toHaveTextContent(
      "Ramp slope over the limit"
    );
  });

  it("closes the comments sidebar", async () => {
    const user = await openReportTab();

    await user.click(screen.getByRole("button", { name: "comment 0" }));
    await user.click(screen.getByRole("button", { name: "close sidebar" }));

    expect(screen.queryByTestId("comments-sidebar")).not.toBeInTheDocument();
  });

  it("opens the finding dialog with the finding defaults", async () => {
    const user = await openReportTab();

    await user.click(screen.getByRole("button", { name: "edit 0" }));

    expect(screen.getByTestId("dialog-open")).toHaveTextContent("true");
    expect(screen.getByTestId("dialog-audit-id")).toHaveTextContent("audit-1");
    expect(screen.getByTestId("dialog-code")).toHaveTextContent("Q-1");
    expect(screen.getByTestId("dialog-quantity")).toHaveTextContent("2");
    expect(screen.getByTestId("dialog-notes")).toHaveTextContent(
      "Measured at 10%"
    );
  });

  it("clears the selected finding when the dialog closes", async () => {
    const user = await openReportTab();

    await user.click(screen.getByRole("button", { name: "edit 0" }));
    await user.click(screen.getByRole("button", { name: "close dialog" }));

    expect(screen.getByTestId("dialog-open")).toHaveTextContent("false");
    expect(screen.getByTestId("dialog-code")).toBeEmptyDOMElement();
    expect(screen.getByTestId("dialog-quantity")).toHaveTextContent("null");
    expect(screen.getByTestId("dialog-notes")).toHaveTextContent("null");
  });
});

describe("AuditEditContent — comment and dialog fallbacks", () => {
  it("falls back to the item index and the mitigation when there is no code or barrier", async () => {
    reviewDetailState.data = makeReviewDetail({
      findings: [
        makeFinding({
          questionCode: "",
          barrierStatement: null,
          proposedMitigation: "Rebuild the ramp",
        }),
      ],
    });
    render(<AuditEditContent id="audit-1" auditDetail={makeAuditDetail()} />);
    const user = await openReportTab();

    await user.click(screen.getByRole("button", { name: "comment 0" }));

    // questionCode vacío es falsy para `??`... pero "" no lo es: se conserva.
    expect(screen.getByTestId("sidebar-id")).toBeEmptyDOMElement();
    expect(screen.getByTestId("sidebar-title")).toHaveTextContent(
      "Rebuild the ramp"
    );
  });

  it("falls back to Item N when neither statement is present", async () => {
    reviewDetailState.data = makeReviewDetail({
      findings: [
        makeFinding({
          barrierStatement: null,
          proposedMitigation: null,
        }),
      ],
    });
    render(<AuditEditContent id="audit-1" auditDetail={makeAuditDetail()} />);
    const user = await openReportTab();

    await user.click(screen.getByRole("button", { name: "comment 0" }));

    expect(screen.getByTestId("sidebar-title")).toHaveTextContent("Item 1");
  });

  it("normalizes a non finite quantity to null in the dialog defaults", async () => {
    reviewDetailState.data = makeReviewDetail({
      findings: [makeFinding({ quantity: Number.NaN, notes: null })],
    });
    render(<AuditEditContent id="audit-1" auditDetail={makeAuditDetail()} />);
    const user = await openReportTab();

    await user.click(screen.getByRole("button", { name: "edit 0" }));

    expect(screen.getByTestId("dialog-quantity")).toHaveTextContent("null");
    expect(screen.getByTestId("dialog-notes")).toHaveTextContent("null");
  });

  it("uses the item index as the comment target when the finding has no code", async () => {
    reviewDetailState.data = makeReviewDetail({
      findings: [
        makeFinding({ questionCode: undefined as unknown as string }),
      ],
    });
    render(<AuditEditContent id="audit-1" auditDetail={makeAuditDetail()} />);
    const user = await openReportTab();

    await user.click(screen.getByRole("button", { name: "comment 0" }));

    expect(screen.getByTestId("sidebar-id")).toHaveTextContent(
      "report-item-1"
    );
  });
});

describe("AuditEditContent — status selector", () => {
  it("reflects the review status", async () => {
    render(<AuditEditContent id="audit-1" auditDetail={makeAuditDetail()} />);
    await openReportTab();

    expect(screen.getByRole("combobox", { name: "" })).toHaveValue(
      "draft_report_in_review"
    );
  });

  it("sends the picked status", async () => {
    render(<AuditEditContent id="audit-1" auditDetail={makeAuditDetail()} />);
    const user = await openReportTab();

    const select = screen.getByDisplayValue("Draft Report In Review");
    await user.selectOptions(select, "completed");

    expect(mutateStatus).toHaveBeenCalledTimes(1);
    expect(mutateStatus.mock.calls[0]![0]).toEqual({
      auditId: "audit-1",
      status: "completed",
    });
    expect(screen.getByDisplayValue("Completed")).toBeInTheDocument();
  });

  it("rolls the status back when the mutation reports an error", async () => {
    mutateStatus.mockImplementation(
      (
        _input: unknown,
        options: { onError: () => void }
      ) => options.onError()
    );
    render(<AuditEditContent id="audit-1" auditDetail={makeAuditDetail()} />);
    const user = await openReportTab();

    await user.selectOptions(
      screen.getByDisplayValue("Draft Report In Review"),
      "completed"
    );

    expect(
      screen.getByDisplayValue("Draft Report In Review")
    ).toBeInTheDocument();
  });

  it("disables the selector while there is no review status", async () => {
    reviewDetailState.data = makeReviewDetail({
      status: undefined as unknown as AuditReviewDetail["status"],
    });
    render(<AuditEditContent id="audit-1" auditDetail={makeAuditDetail()} />);
    await openReportTab();

    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("does not send anything when the review has no status", async () => {
    // Sin status el handler corta antes de llamar a la mutación.
    reviewDetailState.data = makeReviewDetail({
      status: undefined as unknown as AuditReviewDetail["status"],
    });
    render(<AuditEditContent id="audit-1" auditDetail={makeAuditDetail()} />);
    await openReportTab();

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "completed" },
    });

    expect(mutateStatus).not.toHaveBeenCalled();
  });

  it("disables the selector while the status update is in flight", async () => {
    statusState.isPending = true;
    render(<AuditEditContent id="audit-1" auditDetail={makeAuditDetail()} />);
    await openReportTab();

    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});

describe("AuditEditContent — report export", () => {
  it("disables the export button when there are no findings", async () => {
    reviewDetailState.data = makeReviewDetail({ findings: [] });
    render(<AuditEditContent id="audit-1" auditDetail={makeAuditDetail()} />);
    await openReportTab();

    expect(screen.getByLabelText("Export to PDF")).toBeDisabled();
  });

  it("starts the orchestrated export without opening a tab", async () => {
    const open = vi.fn();
    vi.stubGlobal("open", open);
    render(<AuditEditContent id="audit-1" auditDetail={makeAuditDetail()} />);
    await openReportTab();

    await userEvent.click(screen.getByLabelText("Export to PDF"));

    expect(startExport).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
  });

  it("shows the phase and percent while export is active", async () => {
    exportState.isBusy = true;
    exportState.isOpen = true;
    exportState.progress = {
      phase: "generating",
      percent: 42,
      message: "Rendering the PDF…",
      bytes: null,
      error: null,
    };
    render(<AuditEditContent id="audit-1" auditDetail={makeAuditDetail()} />);
    await openReportTab();

    const button = screen.getByLabelText("Export to PDF");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Rendering the PDF… 42%");
    expect(screen.getByTestId("export-modal")).toHaveTextContent("true");
    expect(screen.getByTestId("export-modal")).toHaveTextContent("report.pdf");
  });

  it("forwards modal actions to the export orchestrator", async () => {
    exportState.isOpen = true;
    render(<AuditEditContent id="audit-1" auditDetail={makeAuditDetail()} />);

    await userEvent.click(screen.getByRole("button", { name: "stop export" }));
    await userEvent.click(screen.getByRole("button", { name: "retry export" }));
    await userEvent.click(screen.getByRole("button", { name: "close export" }));

    expect(stopExport).toHaveBeenCalledTimes(1);
    expect(retryExport).toHaveBeenCalledTimes(1);
    expect(closeExport).toHaveBeenCalledTimes(1);
  });

  it("does not put aria-live on the whole report section", async () => {
    const { container } = render(
      <AuditEditContent id="audit-1" auditDetail={makeAuditDetail()} />
    );
    await openReportTab();

    expect(container.querySelector("section[aria-live]")).toBeNull();
  });
});
