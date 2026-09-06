import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: {} as any,
  detail: {} as any,
  deleteReport: vi.fn(),
  restoreReport: vi.fn(),
}));
vi.mock("@features/reports/lib/hooks/useReportsQuery", () => ({ useReportsListQuery: () => mocks.list }));
vi.mock("@features/reports/lib/hooks/useReportByIdQuery", () => ({ useReportByIdQuery: () => mocks.detail }));
vi.mock("@features/reports/lib/hooks/useDeleteReport", () => ({ useDeleteReport: () => ({ mutateAsync: mocks.deleteReport }) }));
vi.mock("@features/reports/lib/hooks/useRestoreReport", () => ({ useRestoreReport: () => ({ mutateAsync: mocks.restoreReport }) }));
vi.mock("@shared/lib/useDebouncedSearch", () => ({ useDebouncedSearch: (value: string) => value.trim().toLowerCase() }));
vi.mock("@shared/ui/page-header", () => ({ default: ({ title }: any) => <h1>{title}</h1> }));
vi.mock("@features/reports/ui/ReportsSearchCard", () => ({
  default: ({ query, onQueryChange, placeholder }: any) => (
    <input aria-label="Report search" value={query} placeholder={placeholder} onChange={(event) => onQueryChange(event.target.value)} />
  ),
}));
vi.mock("@features/reports/ui/ReportsListCard", () => ({
  default: (props: any) => (
    <section
      data-testid="reports-list"
      data-items={props.items.map((item: any) => item.id).join(",")}
      data-total={props.totalCount}
      data-loading={props.isLoading}
      data-error={props.isError}
      data-deleting={props.deletingId ?? ""}
      data-restoring={props.restoringId ?? ""}
    >
      <button onClick={props.onError}>Reload reports</button>
      <button onClick={() => props.onDownload("report-1")}>Download first</button>
      <button onClick={() => props.onDelete("report-1")}>Archive first</button>
      <button onClick={() => props.onRestore("report-1")}>Restore first</button>
    </section>
  ),
}));

import ReportsPage from "./page";

const items = [
  { id: "report-1", reportName: "Ramp report", createdAt: "2026-01-01", status: "succeeded" },
  { id: "report-2", reportName: "Elevator report", createdAt: "2026-02-01", status: "archived" },
];

describe("ReportsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list = { data: { items, count: 2 }, isLoading: false, isError: false, refetch: vi.fn() };
    mocks.detail = { data: undefined, isLoading: false, isError: false, error: null };
    mocks.deleteReport.mockResolvedValue({});
    mocks.restoreReport.mockResolvedValue({});
    vi.spyOn(window, "open").mockReturnValue(window);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("lists, searches and refreshes reports", async () => {
    const user = userEvent.setup();
    render(<ReportsPage />);
    expect(screen.getByTestId("reports-list")).toHaveAttribute("data-items", "report-1,report-2");
    await user.type(screen.getByRole("textbox", { name: "Report search" }), "elevator");
    expect(screen.getByTestId("reports-list")).toHaveAttribute("data-items", "report-2");
    await user.click(screen.getByRole("button", { name: "Reload reports" }));
    expect(mocks.list.refetch).toHaveBeenCalledOnce();
  });

  it("opens a valid report URL and offers a fallback for blocked popups", async () => {
    const user = userEvent.setup();
    mocks.detail = { data: { reportUrl: "https://reports.example/report.pdf" }, isLoading: false, isError: false, error: null };
    const { rerender } = render(<ReportsPage />);
    await user.click(screen.getByRole("button", { name: "Download first" }));
    await waitFor(() => expect(window.open).toHaveBeenCalledWith("https://reports.example/report.pdf", "_blank", "noopener,noreferrer"));

    vi.mocked(window.open).mockReturnValue(null);
    rerender(<ReportsPage />);
    await user.click(screen.getByRole("button", { name: "Download first" }));
    const fallback = await screen.findByRole("link", { name: "Open download" });
    expect(fallback).toHaveAttribute("href", "https://reports.example/report.pdf");
    fallback.addEventListener("click", (event) => event.preventDefault());
    await user.click(fallback);
    expect(screen.queryByRole("link", { name: "Open download" })).not.toBeInTheDocument();
  });

  it("displays download errors and invalid artifact URLs", async () => {
    const user = userEvent.setup();
    mocks.detail = { data: undefined, isLoading: false, isError: true, error: new Error("Expired URL") };
    const { rerender } = render(<ReportsPage />);
    await user.click(screen.getByRole("button", { name: "Download first" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Expired URL");

    mocks.detail = { data: { reportUrl: "javascript:bad" }, isLoading: false, isError: false, error: null };
    rerender(<ReportsPage />);
    await user.click(screen.getByRole("button", { name: "Download first" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("not available for download");
  });

  it("archives only after confirmation and reports archive failures", async () => {
    const user = userEvent.setup();
    vi.mocked(window.confirm).mockReturnValueOnce(false).mockReturnValue(true);
    render(<ReportsPage />);
    await user.click(screen.getByRole("button", { name: "Archive first" }));
    expect(mocks.deleteReport).not.toHaveBeenCalled();
    mocks.deleteReport.mockRejectedValueOnce(new Error("failed"));
    await user.click(screen.getByRole("button", { name: "Archive first" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be archived");
    await waitFor(() => expect(screen.getByTestId("reports-list")).toHaveAttribute("data-deleting", ""));
  });

  it("restores report versions and exposes failures", async () => {
    const user = userEvent.setup();
    mocks.restoreReport.mockRejectedValueOnce(new Error("failed"));
    render(<ReportsPage />);
    await user.click(screen.getByRole("button", { name: "Restore first" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be restored");
    await user.click(screen.getByRole("button", { name: "Restore first" }));
    await waitFor(() => expect(mocks.restoreReport).toHaveBeenCalledTimes(2));
  });

  it("forwards list loading, error and count fallbacks", () => {
    mocks.list = { data: { items: [], count: undefined }, isLoading: true, isError: true, refetch: vi.fn() };
    render(<ReportsPage />);
    expect(screen.getByTestId("reports-list")).toHaveAttribute("data-loading", "true");
    expect(screen.getByTestId("reports-list")).toHaveAttribute("data-error", "true");
    expect(screen.getByTestId("reports-list")).toHaveAttribute("data-total", "0");
  });
});
