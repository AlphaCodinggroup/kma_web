/**
 * Página de reportes: filtrado, descarga y borrado.
 *
 * Los componentes de feature se stubbean para que el test ejercite la lógica de
 * la página (filtro, estado de descarga, confirmación de borrado) y no el
 * render de las tarjetas, que se prueba en su propio directorio.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useReportsListQuery = vi.fn();
const useReportByIdQuery = vi.fn();
const mutateAsync = vi.fn();

vi.mock("@features/reports/lib/hooks/useReportsQuery", () => ({
  useReportsListQuery: (...args: unknown[]) => useReportsListQuery(...args),
}));
vi.mock("@features/reports/lib/hooks/useReportByIdQuery", () => ({
  useReportByIdQuery: (...args: unknown[]) => useReportByIdQuery(...args),
}));
vi.mock("@features/reports/lib/hooks/useDeleteReport", () => ({
  useDeleteReport: () => ({ mutateAsync }),
}));

// El debounce se anula: el test no mide tiempo, mide el filtrado.
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

// El stub expone los props que la página controla, para poder afirmarlos.
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
    isDownloading,
  }: {
    items: Array<{ id: string; reportName?: string | null }>;
    totalCount: number;
    isLoading: boolean;
    isError: boolean;
    onError: () => void;
    onDownload: (id: string) => void;
    onDelete: (id: string) => void;
    deletingId: string | null;
    isDownloading: boolean;
  }) => (
    <div>
      <span data-testid="total">{totalCount}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="error">{String(isError)}</span>
      <span data-testid="downloading">{String(isDownloading)}</span>
      <span data-testid="deleting">{deletingId ?? "none"}</span>
      <button onClick={onError}>retry</button>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <span>{item.reportName}</span>
            <button onClick={() => onDownload(item.id)}>
              download {item.id}
            </button>
            <button onClick={() => onDelete(item.id)}>delete {item.id}</button>
          </li>
        ))}
      </ul>
    </div>
  ),
}));

/** Reporte mínimo del listado. */
function makeReport(overrides: Record<string, unknown> = {}) {
  return {
    id: "audit-1",
    reportName: "Curb ramps",
    createdAt: "2026-01-15T10:30:00Z",
    status: "completed",
    ...overrides,
  };
}

/** Estado por defecto de los hooks: listado con un reporte y sin descarga. */
function stubHooks(
  list: Record<string, unknown> = {},
  detail: Record<string, unknown> = {}
) {
  useReportsListQuery.mockReturnValue({
    data: { items: [makeReport()], count: 1 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...list,
  });
  useReportByIdQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    ...detail,
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
    stubHooks();
  });

  it("renders the header and the list with its total", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { name: "Reports" })).toBeTruthy();
    expect(screen.getByTestId("total").textContent).toBe("1");
    expect(screen.getByText("Curb ramps")).toBeTruthy();
  });

  it("falls back to the filtered length when the response has no count", async () => {
    stubHooks({ data: { items: [makeReport()] } });

    await renderPage();

    expect(screen.getByTestId("total").textContent).toBe("1");
  });

  it("renders an empty list when there is no data", async () => {
    stubHooks({ data: undefined });

    await renderPage();

    expect(screen.getByTestId("total").textContent).toBe("0");
  });

  it.each([
    ["the report name", "curb", 1],
    ["the status", "completed", 1],
    ["nothing that matches", "zzz", 0],
  ])("filters by %s", async (_label, term, expected) => {
    await renderPage();

    await userEvent.type(
      screen.getByLabelText("Search reports..."),
      term
    );

    await waitFor(() =>
      expect(screen.queryAllByText("Curb ramps")).toHaveLength(expected)
    );
  });

  it("keeps every item when the query is empty", async () => {
    await renderPage();

    expect(screen.getByText("Curb ramps")).toBeTruthy();
  });

  it("propagates the loading and error state of the list", async () => {
    stubHooks({ isLoading: true, isError: true });

    await renderPage();

    expect(screen.getByTestId("loading").textContent).toBe("true");
    expect(screen.getByTestId("error").textContent).toBe("true");
  });

  it("refetches the list from the error action", async () => {
    const refetch = vi.fn();
    stubHooks({ refetch });

    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "retry" }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("enables the detail query only after asking for a download", async () => {
    await renderPage();

    expect(useReportByIdQuery).toHaveBeenLastCalledWith({
      id: undefined,
      enabled: false,
    });

    await userEvent.click(
      screen.getByRole("button", { name: "download audit-1" })
    );

    await waitFor(() =>
      expect(useReportByIdQuery).toHaveBeenLastCalledWith({
        id: "audit-1",
        enabled: true,
      })
    );
  });

  it("opens the report url once the detail query resolves", async () => {
    const open = vi.fn();
    vi.stubGlobal("open", open);
    stubHooks(
      {},
      { data: { reportUrl: "https://s3.example.com/r.pdf", status: "completed" } }
    );

    await renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: "download audit-1" })
    );

    await waitFor(() =>
      expect(open).toHaveBeenCalledWith(
        "https://s3.example.com/r.pdf",
        "_blank",
        "noopener,noreferrer"
      )
    );
  });

  it.each([
    ["a relative path", "/local/r.pdf"],
    ["a javascript url", "javascript:alert(1)"],
    ["an empty url", ""],
  ])("does not open %s", async (_label, reportUrl) => {
    const open = vi.fn();
    vi.stubGlobal("open", open);
    stubHooks({}, { data: { reportUrl, status: "pending" } });

    await renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: "download audit-1" })
    );

    await waitFor(() =>
      expect(screen.getByTestId("downloading").textContent).toBe("false")
    );
    expect(open).not.toHaveBeenCalled();
  });

  it("clears the pending download when the detail query fails", async () => {
    const open = vi.fn();
    vi.stubGlobal("open", open);
    stubHooks({}, { isError: true, error: new Error("boom") });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: "download audit-1" })
    );

    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(open).not.toHaveBeenCalled();
  });

  it("waits for the detail query while it is loading", async () => {
    const open = vi.fn();
    vi.stubGlobal("open", open);
    stubHooks({}, { isLoading: true });

    await renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: "download audit-1" })
    );

    expect(open).not.toHaveBeenCalled();
    expect(screen.getByTestId("downloading").textContent).toBe("true");
  });

  it("deletes a report after the confirmation", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    mutateAsync.mockResolvedValue(undefined);

    await renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: "delete audit-1" })
    );

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith("audit-1"));
    expect(screen.getByTestId("deleting").textContent).toBe("none");
  });

  it("does not delete when the confirmation is dismissed", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));

    await renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: "delete audit-1" })
    );

    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("reports a failed deletion and clears the pending id", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    const alertMock = vi.fn();
    vi.stubGlobal("alert", alertMock);
    mutateAsync.mockRejectedValue(new Error("conflict"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: "delete audit-1" })
    );

    await waitFor(() => expect(alertMock).toHaveBeenCalled());
    expect(consoleError).toHaveBeenCalled();
    expect(screen.getByTestId("deleting").textContent).toBe("none");
  });
});
