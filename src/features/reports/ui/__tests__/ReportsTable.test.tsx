import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReportListItem } from "@entities/report/model/report-list";
import type { AuditStatus } from "@entities/audit/model";

const isAdminMock = vi.fn<() => boolean>(() => true);

vi.mock("@processes/auth/hooks", () => ({
  useSession: () => ({
    session: { user: null, authenticated: true },
    user: null,
    isAuthenticated: true,
    isAdmin: isAdminMock(),
  }),
}));

import ReportsTable, { type ReportsTableProps } from "../ReportsTable";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReport(overrides?: Partial<ReportListItem>): ReportListItem {
  return {
    id: "r-1",
    flowId: "fl-1",
    userId: "u-1",
    reportName: "Plant A",
    status: "completed",
    reportUrl: "https://files.test/r-1.pdf",
    createdAt: "2026-01-02T10:30:00Z",
    updatedAt: null,
    completedAt: null,
    ...overrides,
  };
}

// Un reporte "listo" tiene reportUrl; uno "generándose" todavía no.
const readyReport = makeReport({
  id: "ready",
  reportName: "Plant Ready",
  status: "completed",
  reportUrl: "https://files.test/ready.pdf",
  createdAt: "2026-03-01T08:00:00Z",
});

const generatingReport = makeReport({
  id: "generating",
  reportName: "Plant Generating",
  status: "draft_report_pending_review",
  reportUrl: null,
  createdAt: "2026-01-15T12:45:00Z",
});

const inReviewReport = makeReport({
  id: "in-review",
  reportName: "Alpha Site",
  status: "draft_report_in_review",
  reportUrl: "https://files.test/in-review.pdf",
  createdAt: "2026-02-10T09:15:00Z",
});

const items = [readyReport, generatingReport, inReviewReport];

function renderTable(overrides?: Partial<ReportsTableProps>) {
  const props: ReportsTableProps = {
    items,
    isLoading: false,
    isError: false,
    downloadingId: null,
    onDownload: vi.fn(),
    onDelete: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  };

  const utils = render(<ReportsTable {...props} />);
  return { ...utils, props };
}

/** Devuelve los nombres de proyecto en el orden pintado. */
function projectColumn(): string[] {
  const rows = screen.getAllByRole("row").slice(1);
  return rows.map((row) => within(row).getAllByRole("cell")[0]?.textContent ?? "");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ReportsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAdminMock.mockReturnValue(true);
  });

  // -------------------------------------------------------------------------
  // Listado
  // -------------------------------------------------------------------------

  it("renders the sortable headers plus the export one", () => {
    renderTable();

    expect(screen.getByRole("button", { name: "Project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Created At" })).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Export to PDF" })
    ).toBeInTheDocument();
  });

  it("renders one row per report", () => {
    renderTable();

    expect(screen.getAllByRole("row")).toHaveLength(items.length + 1);
    expect(screen.getByRole("cell", { name: "Plant Ready" })).toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: "Plant Generating" })
    ).toBeInTheDocument();
  });

  it("renders a dash when the report has no name", () => {
    renderTable({ items: [makeReport({ reportName: null })] });

    expect(screen.getByRole("cell", { name: "—" })).toBeInTheDocument();
  });

  it("formats the creation date as YYYY-MM-DD HH:mm", () => {
    renderTable({ items: [readyReport] });

    expect(screen.getByRole("cell", { name: "2026-03-01 08:00" })).toBeInTheDocument();
  });

  it("renders a dash when the creation date is empty", () => {
    renderTable({ items: [makeReport({ createdAt: "" })] });

    expect(screen.getByRole("cell", { name: "-" })).toBeInTheDocument();
  });

  const statusLabels: Array<{ status: AuditStatus; label: string }> = [
    { status: "draft_report_pending_review", label: "Draft Report Pending Review" },
    { status: "draft_report_in_review", label: "Draft Report In Review" },
    { status: "final_report_sent_to_client", label: "Final Report Sent to Client" },
    { status: "completed", label: "Completed" },
  ];

  it.each(statusLabels)("renders the $status badge as $label", ({ status, label }) => {
    renderTable({ items: [makeReport({ status })] });

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Generándose vs listo
  // -------------------------------------------------------------------------

  it("offers the download action for a report that is ready", () => {
    renderTable({ items: [readyReport] });

    const download = screen.getByRole("button", { name: "Download report" });
    expect(download).toBeEnabled();
  });

  it("blocks the download for a report still being generated", () => {
    renderTable({ items: [generatingReport] });

    const download = screen.getByRole("button", {
      name: "Report not available yet",
    });
    expect(download).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Download report" })
    ).not.toBeInTheDocument();
  });

  it("distinguishes ready from generating rows in the same table", () => {
    renderTable();

    expect(screen.getAllByRole("button", { name: "Download report" })).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Report not available yet" })
    ).toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // Descarga
  // -------------------------------------------------------------------------

  it("calls onDownload with the report id", async () => {
    const onDownload = vi.fn();
    const user = userEvent.setup();
    renderTable({ items: [readyReport], onDownload });

    await user.click(screen.getByRole("button", { name: "Download report" }));

    expect(onDownload).toHaveBeenCalledWith("ready");
  });

  it("shows progress only in the row being downloaded", () => {
    renderTable({ items: [readyReport, inReviewReport], downloadingId: "ready" });

    expect(
      screen.getByRole("progressbar", { name: "Downloading report" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download report" })).toBeEnabled();
  });

  it("does not expose a second action for the row being downloaded", async () => {
    const onDownload = vi.fn();
    renderTable({ items: [readyReport], onDownload, downloadingId: "ready" });

    expect(
      screen.queryByRole("button", { name: "Download report" })
    ).not.toBeInTheDocument();
    expect(onDownload).not.toHaveBeenCalled();
  });

  it("does not call onDownload for a report without a url", async () => {
    const onDownload = vi.fn();
    const user = userEvent.setup();
    renderTable({ items: [generatingReport], onDownload });

    await user.click(
      screen.getByRole("button", { name: "Report not available yet" })
    );

    expect(onDownload).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Borrado
  // -------------------------------------------------------------------------

  it("calls onDelete with the report id so the caller can confirm", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderTable({ items: [readyReport], onDelete });

    await user.click(screen.getByRole("button", { name: "Delete report" }));

    expect(onDelete).toHaveBeenCalledWith("ready");
  });

  it("disables the delete action of the row being deleted", () => {
    renderTable({ items: [readyReport], deletingId: "ready" });

    expect(screen.getByRole("button", { name: "Delete report" })).toBeDisabled();
  });

  it("keeps the other rows deletable while one is being deleted", () => {
    renderTable({ deletingId: "ready" });

    const buttons = screen.getAllByRole("button", { name: "Delete report" });
    expect(buttons.filter((button) => !button.hasAttribute("disabled"))).toHaveLength(2);
  });

  const deletingCases: Array<{ deletingId: string | null | undefined }> = [
    { deletingId: null },
    { deletingId: undefined },
    { deletingId: "another-id" },
  ];

  it.each(deletingCases)(
    "keeps the delete action enabled when deletingId is $deletingId",
    ({ deletingId }) => {
      renderTable({
        items: [readyReport],
        ...(deletingId !== undefined ? { deletingId } : {}),
      });

      expect(screen.getByRole("button", { name: "Delete report" })).toBeEnabled();
    }
  );

  it("enables the delete action for an administrator", () => {
    isAdminMock.mockReturnValue(true);
    renderTable({ items: [readyReport] });

    const remove = screen.getByRole("button", { name: "Delete report" });
    expect(remove).toBeEnabled();
    expect(remove).toHaveAttribute("title", "Delete report");
  });

  it("disables the delete action for a non administrator", () => {
    isAdminMock.mockReturnValue(false);
    renderTable({ items: [readyReport] });

    const remove = screen.getByRole("button", { name: "Delete report" });
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute(
      "title",
      "Only administrators can delete reports"
    );
  });

  it("still lets a non administrator download a ready report", () => {
    isAdminMock.mockReturnValue(false);
    renderTable({ items: [readyReport] });

    expect(screen.getByRole("button", { name: "Download report" })).toBeEnabled();
  });

  // -------------------------------------------------------------------------
  // Estados de carga, error y vacío
  // -------------------------------------------------------------------------

  it("renders the loading state instead of the table", () => {
    renderTable({ isLoading: true });

    expect(screen.getByText("Loading reports")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders the retry state instead of the table", () => {
    renderTable({ isError: true });

    expect(
      screen.getByText("Failed to load reports. Please try again.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("calls onError when the retry button is clicked", async () => {
    const user = userEvent.setup();
    const { props } = renderTable({ isError: true });

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(props.onError).toHaveBeenCalledTimes(1);
  });

  it("prefers the loading state over the error state", () => {
    renderTable({ isLoading: true, isError: true });

    expect(screen.getByText("Loading reports")).toBeInTheDocument();
    expect(
      screen.queryByText("Failed to load reports. Please try again.")
    ).not.toBeInTheDocument();
  });

  it("renders the default empty message", () => {
    renderTable({ items: [] });

    expect(screen.getByText("No reports found")).toBeInTheDocument();
  });

  it("renders a custom empty message", () => {
    renderTable({ items: [], emptyMessage: "Nothing generated yet" });

    expect(screen.getByText("Nothing generated yet")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Ordenamiento
  // -------------------------------------------------------------------------

  it("keeps the original order until a column is sorted", () => {
    renderTable();

    expect(projectColumn()).toEqual([
      "Plant Ready",
      "Plant Generating",
      "Alpha Site",
    ]);
  });

  const sortableColumns: Array<{ header: string; ascending: string[] }> = [
    {
      header: "Project",
      ascending: ["Alpha Site", "Plant Generating", "Plant Ready"],
    },
    {
      header: "Status",
      // completed < draft_report_in_review < draft_report_pending_review
      ascending: ["Plant Ready", "Alpha Site", "Plant Generating"],
    },
    {
      header: "Created At",
      ascending: ["Plant Generating", "Alpha Site", "Plant Ready"],
    },
  ];

  it.each(sortableColumns)(
    "sorts by $header ascending on the first click",
    async ({ header, ascending }) => {
      const user = userEvent.setup();
      renderTable();

      await user.click(screen.getByRole("button", { name: header }));

      expect(projectColumn()).toEqual(ascending);
    }
  );

  it.each(sortableColumns)(
    "sorts by $header descending on the second click",
    async ({ header, ascending }) => {
      const user = userEvent.setup();
      renderTable();

      const trigger = screen.getByRole("button", { name: header });
      await user.click(trigger);
      await user.click(trigger);

      expect(projectColumn()).toEqual([...ascending].reverse());
    }
  );

  it("clears the sorting on the third click", async () => {
    const user = userEvent.setup();
    renderTable();

    const trigger = screen.getByRole("button", { name: "Project" });
    await user.click(trigger);
    await user.click(trigger);
    await user.click(trigger);

    expect(projectColumn()).toEqual([
      "Plant Ready",
      "Plant Generating",
      "Alpha Site",
    ]);
  });

  it("restarts ascending when switching to another column", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole("button", { name: "Project" }));
    await user.click(screen.getByRole("button", { name: "Project" }));
    await user.click(screen.getByRole("button", { name: "Created At" }));

    expect(projectColumn()).toEqual([
      "Plant Generating",
      "Alpha Site",
      "Plant Ready",
    ]);
  });

  it("sorts reports without a name first when ascending by project", async () => {
    const user = userEvent.setup();
    renderTable({
      items: [
        makeReport({ id: "named", reportName: "Zeta" }),
        makeReport({ id: "unnamed", reportName: null }),
      ],
    });

    await user.click(screen.getByRole("button", { name: "Project" }));

    expect(projectColumn()).toEqual(["—", "Zeta"]);
  });

  it("keeps equal values in a stable relative order", async () => {
    const user = userEvent.setup();
    renderTable({
      items: [
        makeReport({ id: "b", reportName: "Same" }),
        makeReport({ id: "a", reportName: "Same" }),
      ],
    });

    await user.click(screen.getByRole("button", { name: "Project" }));

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(projectColumn()).toEqual(["Same", "Same"]);
  });

  // -------------------------------------------------------------------------
  // Clases del contenedor
  // -------------------------------------------------------------------------

  it("merges a custom className on the wrapper", () => {
    const { container } = renderTable({ className: "!border-0" });

    expect(container.firstElementChild).toHaveClass(
      "overflow-hidden",
      "rounded-2xl",
      "!border-0"
    );
  });

  it("applies the body max height class on the scroll container", () => {
    const { container } = renderTable({ bodyMaxHeightClassName: "max-h-96" });

    expect(container.querySelector(".overflow-auto")).toHaveClass("max-h-96");
  });
});
