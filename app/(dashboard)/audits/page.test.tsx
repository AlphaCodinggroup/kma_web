import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Audit } from "@entities/audit/model";

const mocks = vi.hoisted(() => ({
  list: {} as any,
  listOptions: vi.fn(),
  remove: vi.fn(),
  auditors: [{ id: "auditor-1", name: "Alex" }],
  openReview: vi.fn(),
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@features/audits/lib/hooks/useListAudits", () => ({
  default: (options: unknown) => {
    mocks.listOptions(options);
    return mocks.list;
  },
}));
vi.mock("@features/audits/lib/hooks/useDeleteAudit", () => ({ useDeleteAudit: () => ({ mutateAsync: mocks.remove }) }));
vi.mock("@features/audits/lib/hooks/useAuditors", () => ({ useAuditors: () => ({ auditors: mocks.auditors }) }));
vi.mock("@features/audits/api/audit-review.repo.impl", () => ({ auditReviewDetailRepo: { openReview: mocks.openReview } }));
vi.mock("@shared/ui/page-header", () => ({ default: ({ title }: any) => <h1>{title}</h1> }));
vi.mock("@features/audits/ui/AuditsToolBar", () => ({
  default: (props: any) => (
    <div data-testid="audits-toolbar" data-auditors={props.availableAuditors.length}>
      <input aria-label="Audit search" value={props.searchValue} onChange={(event) => props.onSearchChange(event.target.value)} />
      <button onClick={() => props.onAuditorFilterChange("auditor-1")}>Filter auditor</button>
      <button onClick={() => props.onStatusFilterChange("completed")}>Filter status</button>
      <button onClick={props.onClearFilters}>Clear filters</button>
    </div>
  ),
}));
vi.mock("@features/audits/ui/AuditsTable", () => ({
  default: (props: any) => (
    <section
      data-testid="audits-table"
      data-items={props.items.map((item: any) => item.id).join(",")}
      data-total={props.totalItems}
      data-pages={props.totalPages}
      data-deleting={props.deletingId ?? ""}
      data-editing={props.editingId ?? ""}
      data-loading={props.loading}
      data-fetching={props.fetching}
      data-error={props.error}
    >
      <button onClick={props.onError}>Reload audits</button>
      {props.items[0] ? (
        <>
          <button onClick={() => props.onEdit(props.items[0], false)}>Edit first</button>
          <button onClick={() => props.onEdit(props.items[0], true)}>Edit compliant</button>
          <button onClick={() => props.onDelete(props.items[0])}>Delete first</button>
        </>
      ) : null}
      <button onClick={() => props.onPageChange(2)}>Page 2</button>
      <button onClick={() => props.onPageSizeChange(1)}>One per page</button>
    </section>
  ),
}));

import AuditsPage from "./page";

const audit: Audit = {
  id: "audit / 1",
  flowId: "flow-1",
  flowName: "Ramp flow",
  version: 1,
  projectId: "project-1",
  facilityId: "facility-1",
  status: "draft_report_pending_review",
  createdBy: "creator@example.com",
  updatedBy: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  projectName: "Ramp project",
  auditorName: "Alex Smith",
  facilityName: "Main building",
  findingsCount: 1,
};

describe("AuditsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list = {
      data: { audits: [audit, { ...audit, id: "audit-2", projectName: "Elevator project" }], total: 2 },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    };
    mocks.remove.mockResolvedValue({});
    mocks.openReview.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.stubGlobal("alert", vi.fn());
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("filters client-side search and sends server filters", async () => {
    const user = userEvent.setup();
    render(<AuditsPage />);
    expect(screen.getByTestId("audits-table")).toHaveAttribute("data-items", "audit / 1,audit-2");
    await user.type(screen.getByRole("textbox", { name: "Audit search" }), "elevator");
    expect(screen.getByTestId("audits-table")).toHaveAttribute("data-items", "audit-2");
    await user.click(screen.getByRole("button", { name: "Filter auditor" }));
    await user.click(screen.getByRole("button", { name: "Filter status" }));
    expect(mocks.listOptions).toHaveBeenLastCalledWith({ limit: 200, auditor: "auditor-1", status: "completed" });
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(mocks.listOptions).toHaveBeenLastCalledWith({ limit: 200 });
  });

  it("paginates client data and preserves backend pages in server mode", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<AuditsPage />);
    await user.click(screen.getByRole("button", { name: "One per page" }));
    expect(screen.getByTestId("audits-table")).toHaveAttribute("data-items", "audit / 1");
    await user.click(screen.getByRole("button", { name: "Page 2" }));
    expect(screen.getByTestId("audits-table")).toHaveAttribute("data-items", "audit-2");

    mocks.list = { ...mocks.list, data: { audits: [audit], total: 50, last_eval_id: "cursor" } };
    rerender(<AuditsPage />);
    expect(screen.getByTestId("audits-table")).toHaveAttribute("data-items", "audit / 1");
    expect(screen.getByTestId("audits-table")).toHaveAttribute("data-total", "50");
  });

  it("opens pending reviews before navigating with an encoded auditor", async () => {
    const user = userEvent.setup();
    render(<AuditsPage />);
    await user.click(screen.getByRole("button", { name: "Edit first" }));
    await waitFor(() => expect(mocks.openReview).toHaveBeenCalledWith("audit / 1"));
    expect(mocks.push).toHaveBeenCalledWith("/audits/audit%20%2F%201/edit?auditor=Alex%20Smith");
  });

  it("reports open-review failures without navigating", async () => {
    const user = userEvent.setup();
    mocks.openReview.mockRejectedValue(new Error("conflict"));
    render(<AuditsPage />);
    await user.click(screen.getByRole("button", { name: "Edit first" }));
    await waitFor(() => expect(alert).toHaveBeenCalledWith("The review could not be opened. Please try again."));
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.getByTestId("audits-table")).toHaveAttribute("data-editing", "");
  });

  it("blocks report navigation for fully compliant audits", async () => {
    const user = userEvent.setup();
    render(<AuditsPage />);
    await user.click(screen.getByRole("button", { name: "Edit compliant" }));
    expect(screen.getByRole("heading", { name: "No Report Needed" })).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "OK" }));
    expect(screen.queryByRole("heading", { name: "No Report Needed" })).not.toBeInTheDocument();
  });

  it("confirms deletion and exposes backend errors", async () => {
    const user = userEvent.setup();
    vi.mocked(window.confirm).mockReturnValueOnce(false).mockReturnValue(true);
    render(<AuditsPage />);
    await user.click(screen.getByRole("button", { name: "Delete first" }));
    expect(mocks.remove).not.toHaveBeenCalled();
    mocks.remove.mockRejectedValueOnce(new Error("failed"));
    await user.click(screen.getByRole("button", { name: "Delete first" }));
    await waitFor(() => expect(alert).toHaveBeenCalledWith("Error deleting the audit. Please try again."));
    expect(screen.getByTestId("audits-table")).toHaveAttribute("data-deleting", "");
  });
});
