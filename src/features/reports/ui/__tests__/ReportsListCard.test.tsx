import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReportListItem } from "@entities/report/model/report-list";

const isAdminMock = vi.fn<() => boolean>(() => true);

vi.mock("@processes/auth/hooks", () => ({
  useSession: () => ({
    session: { user: null, authenticated: true },
    user: null,
    isAuthenticated: true,
    isAdmin: isAdminMock(),
  }),
}));

import ReportsListCard, {
  type ReportsListCardProps,
} from "../ReportsListCard";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const readyReport: ReportListItem = {
  id: "ready",
  flowId: "fl-1",
  userId: "u-1",
  reportName: "Plant Ready",
  status: "completed",
  reportUrl: "https://files.test/ready.pdf",
  createdAt: "2026-03-01T08:00:00Z",
  updatedAt: null,
  completedAt: null,
};

const generatingReport: ReportListItem = {
  ...readyReport,
  id: "generating",
  reportName: "Plant Generating",
  status: "draft_report_pending_review",
  reportUrl: null,
};

function renderCard(overrides?: Partial<ReportsListCardProps>) {
  const props: ReportsListCardProps = {
    items: [readyReport, generatingReport],
    totalCount: 2,
    isLoading: false,
    isError: false,
    downloadingId: null,
    onDownload: vi.fn(),
    onDelete: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  };

  const utils = render(<ReportsListCard {...props} />);
  return { ...utils, props };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ReportsListCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAdminMock.mockReturnValue(true);
  });

  it("renders the heading with the total count", () => {
    renderCard();

    expect(
      screen.getByRole("heading", { level: 3, name: "All Reports (2)" })
    ).toBeInTheDocument();
  });

  // Un total en cero es dato válido, no ausencia.
  it("renders a zero total count", () => {
    renderCard({ items: [], totalCount: 0 });

    expect(
      screen.getByRole("heading", { level: 3, name: "All Reports (0)" })
    ).toBeInTheDocument();
  });

  it("renders the default description", () => {
    renderCard();

    expect(
      screen.getByText("Complete list of generated audit reports")
    ).toBeInTheDocument();
  });

  it("honours a custom description", () => {
    renderCard({ description: "Only this quarter" });

    expect(screen.getByText("Only this quarter")).toBeInTheDocument();
  });

  it("renders the embedded reports table", () => {
    renderCard();

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Plant Ready" })).toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: "Plant Generating" })
    ).toBeInTheDocument();
  });

  it("renders the rightSlot when provided", () => {
    renderCard({
      rightSlot: <button type="button">Generate report</button>,
    });

    expect(
      screen.getByRole("button", { name: "Generate report" })
    ).toBeInTheDocument();
  });

  it("omits the rightSlot wrapper when not provided", () => {
    const { container } = renderCard();

    // El header sólo contiene el bloque de título.
    const header = container.querySelector("section > div");
    expect(header?.children).toHaveLength(1);
  });

  it("forwards the download intent from the embedded table", async () => {
    const onDownload = vi.fn();
    const user = userEvent.setup();
    renderCard({ items: [readyReport], onDownload });

    await user.click(screen.getByRole("button", { name: "Download report" }));

    expect(onDownload).toHaveBeenCalledWith("ready");
  });

  it("forwards the delete intent from the embedded table", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderCard({ items: [readyReport], onDelete });

    await user.click(screen.getByRole("button", { name: "Delete report" }));

    expect(onDelete).toHaveBeenCalledWith("ready");
  });

  it("forwards the deletingId so the row action is disabled", () => {
    renderCard({ items: [readyReport], deletingId: "ready" });

    expect(screen.getByRole("button", { name: "Delete report" })).toBeDisabled();
  });

  it("forwards downloadingId so the active row shows progress", () => {
    renderCard({ items: [readyReport], downloadingId: "ready" });

    expect(
      screen.getByRole("progressbar", { name: "Downloading report" })
    ).toBeInTheDocument();
  });

  it("renders the loading state of the embedded table but keeps the header", () => {
    renderCard({ isLoading: true });

    expect(screen.getByText("Loading reports")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "All Reports (2)" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders the retry state and forwards onError", async () => {
    const user = userEvent.setup();
    const { props } = renderCard({ isError: true });

    expect(
      screen.getByText("Failed to load reports. Please try again.")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(props.onError).toHaveBeenCalledTimes(1);
  });

  it("renders the empty state of the embedded table", () => {
    renderCard({ items: [], totalCount: 0 });

    expect(screen.getByText("No reports found")).toBeInTheDocument();
  });

  it("applies the card base classes and merges a custom className", () => {
    const { container } = renderCard({ className: "card-extra" });

    expect(container.firstElementChild).toHaveClass(
      "rounded-2xl",
      "border",
      "bg-white",
      "card-extra"
    );
  });

  it("strips the border and radius of the embedded table", () => {
    const { container } = renderCard();

    const tableWrapper = container.querySelector(".\\!border-0");
    expect(tableWrapper).not.toBeNull();
    expect(tableWrapper).toHaveClass("!rounded-none");
  });

  it("applies the default body max height and appends the override", () => {
    const { container } = renderCard({
      bodyMaxHeightClassName: "max-h-40",
    });

    const scroller = container.querySelector(".overflow-auto");
    expect(scroller).toHaveClass("max-h-[520px]", "max-h-40");
  });

  it("keeps only the default body max height when no override is given", () => {
    const { container } = renderCard();

    expect(container.querySelector(".overflow-auto")).toHaveClass(
      "max-h-[520px]"
    );
  });
});
