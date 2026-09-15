/**
 * Listado de auditorías: filtros, paginación híbrida (servidor/cliente),
 * borrado con confirmación y la navegación a la edición, que pasa por
 * send-for-review cuando la auditoría todavía es un borrador.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useListAudits = vi.fn();
const useAuditors = vi.fn();
const useSendForReviewAudit = vi.fn();
const mutateAsync = vi.fn();
const push = vi.fn();
const startSendForReview = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));
vi.mock("@features/audits/lib/hooks/useListAudits", () => ({
  // El stub se nombra con el prefijo "use" para que rules-of-hooks no lo lea
  // como un componente llamado "default".
  default: function useListAuditsStub(...args: unknown[]) {
    return useListAudits(...args);
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
  useListAudits.mockReturnValue({
    data: { audits: [makeAudit()], total: 1 },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
    ...list,
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

  it("asks for the hybrid pagination threshold and no filters by default", async () => {
    await renderPage();

    expect(useListAudits).toHaveBeenCalledWith({ limit: 200 });
  });

  it.each([
    ["the auditor", "filter auditor", { limit: 200, auditor: "jane" }],
    ["the status", "filter status", { limit: 200, status: "completed" }],
  ])("pushes %s filter down to the query", async (_label, button, expected) => {
    await renderPage();

    await userEvent.click(screen.getByRole("button", { name: button }));

    await waitFor(() =>
      expect(useListAudits).toHaveBeenLastCalledWith(expected)
    );
  });

  it("clears both filters at once", async () => {
    await renderPage();

    await userEvent.click(screen.getByRole("button", { name: "filter status" }));
    await userEvent.click(screen.getByRole("button", { name: "clear filters" }));

    await waitFor(() =>
      expect(useListAudits).toHaveBeenLastCalledWith({ limit: 200 })
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

  it("does not filter client side when the backend paginates", async () => {
    stubHooks({
      data: { audits: [makeAudit()], total: 1, last_eval_id: "cursor-1" },
    });

    await renderPage();
    await userEvent.type(screen.getByLabelText("search"), "zzz");

    // En modo servidor el texto no filtra: los datos ya vienen filtrados.
    await waitFor(() => expect(screen.getByText("audit-1")).toBeTruthy());
  });

  it("uses the backend total for the page count in server mode", async () => {
    stubHooks({
      data: { audits: [makeAudit()], total: 120, last_eval_id: "cursor-1" },
    });

    await renderPage();

    expect(screen.getByTestId("total-items").textContent).toBe("120");
    // 120 elementos con páginas de 25 son 5 páginas.
    expect(screen.getByTestId("total-pages").textContent).toBe("5");
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
    stubHooks({ isLoading: true, isFetching: true, isError: true });

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

    expect(confirmMock.mock.calls[0][0]).toContain("Proyecto Norte");
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

    expect(confirmMock.mock.calls[0][0]).toContain("audit-1");
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

    await waitFor(() => expect(alertMock).toHaveBeenCalled());
    expect(consoleError).toHaveBeenCalled();
    expect(screen.getByTestId("deleting").textContent).toBe("none");
  });
});
