import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useReportsListQuery = vi.fn();
const mutateAsync = vi.fn();
const download = vi.fn();
const downloadState = { activeId: null as string | null };

vi.mock("@features/reports/lib/hooks/useReportsQuery", () => ({
  useReportsListQuery: (...args: unknown[]) => useReportsListQuery(...args),
}));
vi.mock("@features/reports/lib/hooks/useDeleteReport", () => ({
  useDeleteReport: () => ({ mutateAsync }),
}));
vi.mock("@features/reports/lib/hooks/useDownloadReportFile", () => ({
  useDownloadReportFile: () => ({
    download,
    activeId: downloadState.activeId,
  }),
}));
vi.mock("@shared/lib/useDebouncedSearch", () => ({
  useDebouncedSearch: (value: string) => value.toLowerCase(),
}));
vi.mock("@shared/ui/page-header", () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock("@features/reports/ui/ReportsSearchCard", () => ({
  default: ({
    query,
    onQueryChange,
    placeholder,
  }: {
    query: string;
    onQueryChange: (value: string) => void;
    placeholder: string;
  }) => (
    <input
      aria-label={placeholder}
      value={query}
      onChange={(event) => onQueryChange(event.target.value)}
    />
  ),
}));
vi.mock("@features/reports/ui/ReportsListCard", () => ({
  default: ({
    items,
    totalCount,
    isLoading,
    isError,
    onError,
    onDownload,
    onDelete,
    deletingId,
    downloadingId,
  }: {
    items: Array<{ id: string; reportName?: string | null }>;
    totalCount: number;
    isLoading: boolean;
    isError: boolean;
    onError: () => void;
    onDownload: (id: string) => void;
    onDelete: (id: string) => void;
    deletingId: string | null;
    downloadingId: string | null;
  }) => (
    <div>
      <span data-testid="total">{totalCount}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="error">{String(isError)}</span>
      <span data-testid="downloading">{downloadingId ?? "none"}</span>
      <span data-testid="deleting">{deletingId ?? "none"}</span>
      <button onClick={onError}>retry</button>
      {items.map((item) => (
        <div key={item.id}>
          <span>{item.reportName}</span>
          <button onClick={() => onDownload(item.id)}>download {item.id}</button>
          <button onClick={() => onDelete(item.id)}>delete {item.id}</button>
        </div>
      ))}
      <button onClick={() => onDownload("missing")}>download missing</button>
    </div>
  ),
}));

const report = {
  id: "audit-1",
  flowId: "flow-1",
  userId: "user-1",
  reportName: "Curb ramps",
  createdAt: "2026-01-15T10:30:00Z",
  updatedAt: null,
  completedAt: null,
  status: "completed",
  reportUrl: "https://s3.example.com/report.pdf",
};

function stubList(overrides: Record<string, unknown> = {}) {
  useReportsListQuery.mockReturnValue({
    data: { items: [report], count: 1 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  });
}

async function renderPage() {
  const { default: ReportsPage } = await import("../page");
  return render(<ReportsPage />);
}

describe("ReportsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    downloadState.activeId = null;
    download.mockResolvedValue({
      bytes: 10,
      usedFallback: false,
      filename: "report.pdf",
    });
    stubList();
  });

  it("renders, filters and forwards list state", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { name: "Reports" })).toBeInTheDocument();
    expect(screen.getByTestId("total")).toHaveTextContent("1");

    await userEvent.type(screen.getByLabelText("Search reports..."), "zzz");
    expect(screen.queryByText("Curb ramps")).not.toBeInTheDocument();
  });

  it("uses the presigned URL already present in the list without opening a tab", async () => {
    const open = vi.fn();
    vi.stubGlobal("open", open);
    download.mockResolvedValue({ bytes: 10, usedFallback: false });
    await renderPage();

    await userEvent.click(screen.getByRole("button", { name: "download audit-1" }));

    expect(download).toHaveBeenCalledWith(report);
    expect(open).not.toHaveBeenCalled();
  });

  it("forwards only the active download id", async () => {
    downloadState.activeId = "audit-1";
    await renderPage();

    expect(screen.getByTestId("downloading")).toHaveTextContent("audit-1");
  });

  it("ignores a download id that is not in the current items", async () => {
    await renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: "download missing" })
    );

    expect(download).not.toHaveBeenCalled();
  });

  it("shows an actionable error when download fails", async () => {
    const alertMock = vi.fn();
    vi.stubGlobal("alert", alertMock);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    download.mockRejectedValue(new Error("network"));
    await renderPage();

    await userEvent.click(screen.getByRole("button", { name: "download audit-1" }));

    await waitFor(() => expect(alertMock).toHaveBeenCalled());
    expect(console.error).toHaveBeenCalled();
  });

  it("refetches the list from its retry action", async () => {
    const refetch = vi.fn();
    stubList({ refetch, isError: true });
    await renderPage();

    await userEvent.click(screen.getByRole("button", { name: "retry" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("deletes after confirmation and reports failures", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    const alertMock = vi.fn();
    vi.stubGlobal("alert", alertMock);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mutateAsync.mockRejectedValue(new Error("conflict"));
    await renderPage();

    await userEvent.click(screen.getByRole("button", { name: "delete audit-1" }));

    await waitFor(() => expect(alertMock).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledWith("audit-1");
    expect(screen.getByTestId("deleting")).toHaveTextContent("none");
  });

  it("does not delete when confirmation is dismissed", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    await renderPage();

    await userEvent.click(screen.getByRole("button", { name: "delete audit-1" }));
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
