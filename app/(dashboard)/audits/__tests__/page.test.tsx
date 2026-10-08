/**
 * Listado de auditorías: filtros, paginación híbrida (servidor/cliente),
 * borrado con confirmación y la navegación a la edición, que pasa por
 * send-for-review cuando la auditoría todavía es un borrador.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useInfiniteAudits = vi.fn();
const useAuditors = vi.fn();
const useSendForReviewAudit = vi.fn();
const mutateAsync = vi.fn();
const push = vi.fn();
const startSendForReview = vi.fn();
const fetchNextPage = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => null,
  useRouter: () => ({ push }),
}));
vi.mock("@features/audits/lib/hooks/useInfiniteAudits", () => ({
  useInfiniteAudits: function useInfiniteAuditsStub(...args: unknown[]) {
    return useInfiniteAudits(...args);
  },
}));
vi.mock("@features/audits/lib/hooks/useDeleteAudit", () => ({
  useDeleteAudit: () => ({ mutateAsync }),
}));
vi.mock("@features/audits/lib/hooks/useAuditors", () => ({
  useAuditors: () => useAuditors(),
}));
vi.mock("@features/audits/lib/hooks/useSendForReviewAudit", () => ({
  useSendForReviewAudit: (...args: unknown[]) => useSendForReviewAudit(...args),
}));
vi.mock("@shared/ui/page-header", () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

// La toolbar se stubbea como controles simples para poder manejar los filtros.
vi.mock("@features/audits/ui/AuditsToolBar", () => ({
  default: ({
    searchValue,
    onSearchChange,
    onAuditorFilterChange,
    onStatusFilterChange,
    onClearFilters,
    availableAuditors,
  }: {
    searchValue: string;
    onSearchChange: (value: string) => void;
    onAuditorFilterChange: (value: string) => void;
    onStatusFilterChange: (value: string) => void;
    onClearFilters: () => void;
    availableAuditors: unknown[];
  }) => (
    <div>
      <input
        aria-label="search"
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <button onClick={() => onAuditorFilterChange("jane")}>filter auditor</button>
      <button onClick={() => onStatusFilterChange("completed")}>filter status</button>
      <button onClick={onClearFilters}>clear filters</button>
      <span data-testid="auditors">{availableAuditors.length}</span>
    </div>
  ),
}));

// La tabla expone los props que la página calcula.
vi.mock("@features/audits/ui/AuditsTable", () => ({
  default: ({
    items,
    onEdit,
    onDelete,
    deletingId,
    editingId,
    loading,
    fetching,
    error,
    onError,
    currentPage,
    totalPages,
    totalItems,
    onPageChange,
    onPageSizeChange,
  }: {
    items: Array<{ id: string; projectName?: string | null; status?: string }>;
    onEdit: (audit: unknown, isCompliant?: boolean) => void;
    onDelete: (audit: unknown) => void;
    deletingId: string | null;
    editingId: string | null;
    loading: boolean;
    fetching: boolean;
    error: boolean;
    onError: () => void;
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  }) => (
    <div>
      <span data-testid="page">{currentPage}</span>
      <span data-testid="total-pages">{totalPages}</span>
      <span data-testid="total-items">{totalItems}</span>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="fetching">{String(fetching)}</span>
      <span data-testid="error">{String(error)}</span>
      <span data-testid="deleting">{deletingId ?? "none"}</span>
      <span data-testid="editing">{editingId ?? "none"}</span>
      <button onClick={onError}>retry</button>
      <button onClick={() => onPageChange(2)}>page 2</button>
      <button onClick={() => onPageSizeChange(1)}>size 1</button>
      <ul>
        {items.map((audit) => (
          <li key={audit.id}>
            <span>{audit.id}</span>
            <button onClick={() => onEdit(audit)}>edit {audit.id}</button>
            <button onClick={() => onEdit(audit, true)}>
              edit compliant {audit.id}
            </button>
            <button onClick={() => onDelete(audit)}>delete {audit.id}</button>
          </li>
        ))}
      </ul>
    </div>
  ),
}));

/** Auditoría del listado, ya en estado revisable. */
function makeAudit(overrides: Record<string, unknown> = {}) {
  return {
    id: "audit-1",
    projectId: "proj-1",
    projectName: "Proyecto Norte",
    facilityName: "Planta",
    flowName: "Curb ramps",
    createdAt: "2026-01-15T10:30:00Z",
    status: "final_report_sent_to_client",
    auditorName: "jane",
    createdBy: "jane",
    ...overrides,
  };
}

function stubHooks(
  list: Record<string, unknown> = {},
  send: Record<string, unknown> = {}
) {
  useInfiniteAudits.mockReturnValue({
    data: { pages: [{ audits: [makeAudit()], total: 1 }] },
    hasNextPage: Boolean((list.data as { last_eval_id?: string })?.last_eval_id),
    fetchNextPage,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
    ...list,
    ...(Object.hasOwn(list, "data") ? { data: list.data ? { pages: [list.data] } : undefined } : {}),
  });
  useAuditors.mockReturnValue({ auditors: [{ id: "u-1", name: "jane" }] });
  useSendForReviewAudit.mockReturnValue({
    start: startSendForReview,
    sendResult: undefined,
    ...send,
  });
}

async function renderPage() {
  const { default: AuditsPage } = await import("../page");
  return render(<AuditsPage />);
}

describe("AuditsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/audits");
    stubHooks();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    vi.stubGlobal("alert", vi.fn());
  });

  it("renders the header, the toolbar and the table", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { name: "Audits" })).toBeTruthy();
    expect(screen.getByTestId("auditors").textContent).toBe("1");
    expect(screen.getByText("audit-1")).toBeTruthy();
  });

  it("requests the incremental list with no filters by default", async () => {
    await renderPage();

    expect(useInfiniteAudits).toHaveBeenCalledWith({});
  });

  it.each([
    ["the auditor", "filter auditor", { auditor: "jane" }],
    ["the status", "filter status", { status: "completed" }],
  ])("pushes %s filter down to the query", async (_label, button, expected) => {
    await renderPage();

    await userEvent.click(screen.getByRole("button", { name: button }));

    await waitFor(() =>
      expect(useInfiniteAudits).toHaveBeenLastCalledWith(expected)
    );
  });

  it("clears both filters at once", async () => {
    await renderPage();

    await userEvent.click(screen.getByRole("button", { name: "filter status" }));
    await userEvent.click(screen.getByRole("button", { name: "clear filters" }));

    await waitFor(() =>
      expect(useInfiniteAudits).toHaveBeenLastCalledWith({})
    );
  });

  it.each([
    ["the project name", "norte", 1],
    ["the facility name", "planta", 1],
    ["the flow name", "curb", 1],
    ["the project id", "proj-1", 1],
    ["the creation date", "2026-01", 1],
    ["nothing that matches", "zzz", 0],
  ])("filters client side by %s", async (_label, term, expected) => {
    await renderPage();

    await userEvent.type(screen.getByLabelText("search"), term);

    await waitFor(() =>
      expect(screen.queryAllByText("audit-1")).toHaveLength(expected)
    );
  });

  it("searches loaded rows and explains partial results when a cursor remains", async () => {
    stubHooks({
      data: { audits: [makeAudit()], total: 1, last_eval_id: "cursor-1" },
    });

    await renderPage();
    await userEvent.type(screen.getByLabelText("search"), "zzz");

    await waitFor(() => expect(screen.queryByText("audit-1")).toBeNull());
    expect(screen.getByText(/Search applies to loaded audits/)).toBeTruthy();
  });

  it("uses only loaded rows for page counts while more server results remain", async () => {
    stubHooks({
      data: { audits: [makeAudit()], total: 120, last_eval_id: "cursor-1" },
    });

    await renderPage();

    expect(screen.getByTestId("total-items").textContent).toBe("1");
    // No promete páginas cuyos datos aún no se han cargado.
    expect(screen.getByTestId("total-pages").textContent).toBe("1");
  });

  it("paginates in memory when the backend returns no cursor", async () => {
    stubHooks({
      data: {
        audits: [makeAudit(), makeAudit({ id: "audit-2" })],
        total: 2,
      },
    });

    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "size 1" }));

    await waitFor(() =>
      expect(screen.getByTestId("total-pages").textContent).toBe("2")
    );
    expect(screen.getByText("audit-1")).toBeTruthy();
    expect(screen.queryByText("audit-2")).toBeNull();
  });

  it("shows the second page of the in memory slice", async () => {
    stubHooks({
      data: {
        audits: [makeAudit(), makeAudit({ id: "audit-2" })],
        total: 2,
      },
    });

    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "size 1" }));
    await userEvent.click(screen.getByRole("button", { name: "page 2" }));

    await waitFor(() => expect(screen.getByText("audit-2")).toBeTruthy());
    expect(screen.queryByText("audit-1")).toBeNull();
  });

  it("goes back to the first page when a filter changes", async () => {
    stubHooks({
      data: {
        audits: [makeAudit(), makeAudit({ id: "audit-2" })],
        total: 2,
      },
    });

    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "size 1" }));
    await userEvent.click(screen.getByRole("button", { name: "page 2" }));
    expect(screen.getByTestId("page").textContent).toBe("2");

    await userEvent.click(screen.getByRole("button", { name: "filter status" }));

    await waitFor(() => expect(screen.getByTestId("page").textContent).toBe("1"));
  });

  it("renders an empty list when there is no data", async () => {
    stubHooks({ data: undefined });

    await renderPage();

    expect(screen.getByTestId("total-items").textContent).toBe("0");
  });

  it("propagates the loading, fetching and error state", async () => {
    stubHooks({ data: undefined, isLoading: true, isFetching: true, isError: true });

    await renderPage();

    expect(screen.getByTestId("loading").textContent).toBe("true");
    expect(screen.getByTestId("fetching").textContent).toBe("true");
    expect(screen.getByTestId("error").textContent).toBe("true");
  });

  it("refetches from the error action", async () => {
    const refetch = vi.fn();
    stubHooks({ refetch });

    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "retry" }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("navigates to the edit page carrying the auditor", async () => {
    await renderPage();

    await userEvent.click(screen.getByRole("button", { name: "edit audit-1" }));

    expect(push).toHaveBeenCalledWith("/audits/audit-1/edit?auditor=jane");
  });

  it("omits the auditor when the audit has none", async () => {
    stubHooks({
      data: {
        audits: [makeAudit({ auditorName: null, createdBy: null })],
        total: 1,
      },
    });

    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "edit audit-1" }));

    expect(push).toHaveBeenCalledWith("/audits/audit-1/edit");
  });

  it("escapes the id and the auditor in the url", async () => {
    stubHooks({
      data: {
        audits: [makeAudit({ id: "audit/1", auditorName: "jane doe" })],
        total: 1,
      },
    });

    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "edit audit/1" }));

    expect(push).toHaveBeenCalledWith(
      "/audits/audit%2F1/edit?auditor=jane%20doe"
    );
  });

  it("sends a draft for review before navigating", async () => {
    stubHooks({
      data: {
        audits: [makeAudit({ status: "draft_report_pending_review" })],
        total: 1,
      },
    });

    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "edit audit-1" }));

    expect(startSendForReview).toHaveBeenCalledWith("audit-1");
    // Todavía no navega: espera el resultado del envío.
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByTestId("editing").textContent).toBe("audit-1");
  });

  it("navigates once the send for review resolves", async () => {
    stubHooks(
      {
        data: {
          audits: [makeAudit({ status: "draft_report_pending_review" })],
          total: 1,
        },
      },
      { sendResult: { ready: true } }
    );

    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "edit audit-1" }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/audits/audit-1/edit")
    );
  });

  it("opens the no report dialog for a compliant audit and does not navigate", async () => {
    await renderPage();

    await userEvent.click(
      screen.getByRole("button", { name: "edit compliant audit-1" })
    );

    expect(await screen.findByText("No Report Needed")).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  it("closes the no report dialog from its OK button", async () => {
    await renderPage();

    await userEvent.click(
      screen.getByRole("button", { name: "edit compliant audit-1" })
    );
    await userEvent.click(screen.getByRole("button", { name: "OK" }));

    await waitFor(() =>
      expect(screen.queryByText("No Report Needed")).toBeNull()
    );
  });

  it("deletes an audit after the confirmation", async () => {
    mutateAsync.mockResolvedValue(undefined);

    await renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: "delete audit-1" })
    );

    await userEvent.click(screen.getByRole("button", { name: "Delete audit" }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith("audit-1"));
    expect(screen.getByTestId("deleting").textContent).toBe("none");
  });

  it("names the project in the confirmation", async () => {
    const confirmMock = vi.fn().mockReturnValue(false);
    vi.stubGlobal("confirm", confirmMock);

    await renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: "delete audit-1" })
    );

    expect(screen.getByRole("dialog")).toHaveTextContent("Proyecto Norte");
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("falls back to the id when the audit has no project name", async () => {
    const confirmMock = vi.fn().mockReturnValue(false);
    vi.stubGlobal("confirm", confirmMock);
    stubHooks({
      data: { audits: [makeAudit({ projectName: null })], total: 1 },
    });

    await renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: "delete audit-1" })
    );

    expect(screen.getByRole("dialog")).toHaveTextContent("audit-1");
  });

  it("reports a failed deletion and clears the pending id", async () => {
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

    await userEvent.click(screen.getByRole("button", { name: "Delete audit" }));
    await screen.findByText("The audit could not be deleted. Please try again.");
    expect(alertMock).not.toHaveBeenCalled();
    consoleError.mockRestore();
    expect(screen.getByTestId("deleting").textContent).toBe("none");
  });
  it("loads the next cursor page without changing filters", async () => {
    stubHooks({ data: { audits: [makeAudit()], total: 120, last_eval_id: "cursor-1" } });
    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "filter status" }));
    await userEvent.click(screen.getByRole("button", { name: "Load more audits" }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    expect(new URLSearchParams(window.location.search).get("status")).toBe("completed");
    expect(useInfiniteAudits).toHaveBeenLastCalledWith({ status: "completed" });
  });

  it("restores search and server filters from the URL", async () => {
    window.history.replaceState({}, "", "/audits?q=planta&status=completed&auditor=jane");
    await renderPage();
    expect(screen.getByLabelText("search")).toHaveValue("planta");
    expect(useInfiniteAudits).toHaveBeenLastCalledWith({ status: "completed", auditor: "jane" });
  });

  it("recovers the cursor block needed by a restored page beyond the first 100 audits", async () => {
    window.history.replaceState({}, "", "/audits?page=5&size=25&status=completed&auditor=jane&q=planta");
    const first = Array.from({ length: 100 }, (_, index) => makeAudit({ id: `audit-${index + 1}` }));
    stubHooks({ data: { audits: first, last_eval_id: "cursor-100" } });
    const { rerender } = await renderPage();
    await waitFor(() => expect(fetchNextPage).toHaveBeenCalledOnce());
    const { default: AuditsPage } = await import("../page");
    const second = Array.from({ length: 25 }, (_, index) => makeAudit({ id: `audit-${index + 101}` }));
    stubHooks({ data: { audits: [...first, ...second] } });
    rerender(<AuditsPage />);
    expect(screen.getByTestId("page")).toHaveTextContent("5");
    expect(screen.getByText("audit-101")).toBeInTheDocument();
    expect(screen.queryByText("audit-100")).toBeNull();
    expect(fetchNextPage).toHaveBeenCalledOnce();
    expect(useInfiniteAudits).toHaveBeenLastCalledWith({ status: "completed", auditor: "jane" });
    expect(new URLSearchParams(window.location.search).get("page")).toBe("5");
  });

  it("loads successive cursor blocks and stops at the end for an out-of-range URL page", async () => {
    window.history.replaceState({}, "", "/audits?page=999&size=25");
    const first = Array.from({ length: 100 }, (_, index) => makeAudit({ id: `audit-${index + 1}` }));
    stubHooks({ data: { audits: first, last_eval_id: "cursor-100" } });
    const { rerender } = await renderPage();
    await waitFor(() => expect(fetchNextPage).toHaveBeenCalledTimes(1));
    const { default: AuditsPage } = await import("../page");
    const second = Array.from({ length: 100 }, (_, index) => makeAudit({ id: `audit-${index + 101}` }));
    stubHooks({ data: { audits: [...first, ...second], last_eval_id: "cursor-200" } });
    rerender(<AuditsPage />);
    await waitFor(() => expect(fetchNextPage).toHaveBeenCalledTimes(2));
    stubHooks({ data: { audits: [...first, ...second, makeAudit({ id: "audit-201" })] } });
    rerender(<AuditsPage />);
    expect(screen.getByTestId("page")).toHaveTextContent("9");
    expect(screen.getByText("audit-201")).toBeInTheDocument();
    rerender(<AuditsPage />);
    expect(fetchNextPage).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("button", { name: "Load more audits" })).toBeNull();
  });

  it("stops automatic page restoration on an incremental error and leaves retry available", async () => {
    window.history.replaceState({}, "", "/audits?page=5&size=25");
    const first = Array.from({ length: 100 }, (_, index) => makeAudit({ id: `audit-${index + 1}` }));
    stubHooks({ data: { audits: first, last_eval_id: "cursor-100" } });
    const { rerender } = await renderPage();
    await waitFor(() => expect(fetchNextPage).toHaveBeenCalledOnce());
    const { default: AuditsPage } = await import("../page");
    stubHooks({ data: { audits: first, last_eval_id: "cursor-100" }, isFetchNextPageError: true });
    rerender(<AuditsPage />);
    rerender(<AuditsPage />);
    expect(fetchNextPage).toHaveBeenCalledOnce();
    expect(screen.getByText("audit-100")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("current results and filters are preserved");
    await userEvent.click(screen.getByRole("button", { name: "Retry loading more" }));
    expect(fetchNextPage).toHaveBeenCalledTimes(2);
    expect(new URLSearchParams(window.location.search).get("page")).toBe("5");
  });

  it.each(["isFetching", "isRefetchError"])("does not start page restoration during %s", async flag => {
    window.history.replaceState({}, "", "/audits?page=5&size=25");
    stubHooks({ data: { audits: [makeAudit()], last_eval_id: "cursor" }, [flag]: true });
    await renderPage();
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it("retries an incremental error while retaining loaded results", async () => {
    stubHooks({ data: { audits: [makeAudit()], total: 2, last_eval_id: "cursor" }, isFetchNextPageError: true });
    await renderPage();
    expect(screen.getByText("audit-1")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("current results and filters are preserved");
    await userEvent.click(screen.getByRole("button", { name: "Retry loading more" }));
    expect(fetchNextPage).toHaveBeenCalledOnce();
  });

  it("shows a refresh failure while retaining cached rows and offers refresh retry", async () => {
    const refetch = vi.fn();
    stubHooks({ data: { audits: [makeAudit(), makeAudit({ id: "audit-2" })], total: 2 }, isError: true, isRefetchError: true, refetch });
    await renderPage();
    expect(screen.getByText("audit-1")).toBeInTheDocument();
    expect(screen.getByText("audit-2")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Audits could not be refreshed");
    expect(screen.getByRole("status")).toHaveTextContent("Showing previously loaded results");
    expect(screen.getByRole("status")).not.toHaveTextContent("All available results loaded");
    await userEvent.click(screen.getByRole("button", { name: "Retry refresh" }));
    expect(refetch).toHaveBeenCalledOnce();
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

});
