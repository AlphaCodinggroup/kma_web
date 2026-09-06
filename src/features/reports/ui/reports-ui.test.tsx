import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReportListItem } from "@entities/report/model/report-list";

const session = vi.hoisted(() => ({ isAdmin: true }));
vi.mock("@processes/auth/hooks", () => ({ useSession: () => session }));

import ReportsListCard from "./ReportsListCard";
import ReportsSearchCard from "./ReportsSearchCard";
import ReportsTable from "./ReportsTable";

const report = (overrides: Partial<ReportListItem> = {}): ReportListItem => ({
  id: "report-1",
  flowId: "flow-1",
  userId: "user-1",
  reportName: "Zeta Project",
  status: "completed",
  reportUrl: "https://cdn.example/report.pdf",
  createdAt: "2026-09-05T12:00:00Z",
  updatedAt: null,
  completedAt: "2026-09-05T12:00:00Z",
  triggerAuditId: "audit-1",
  attempt: 1,
  archivedAt: null,
  includedAudits: ["audit-1@2"],
  ...overrides,
});

const handlers = () => ({
  onDownload: vi.fn(),
  onDelete: vi.fn(),
  onRestore: vi.fn(),
  onError: vi.fn(),
});

afterEach(cleanup);
beforeEach(() => {
  session.isAdmin = true;
});

describe("reports UI", () => {
  it("renders loading, error and empty states", async () => {
    const actions = handlers();
    const { rerender } = render(
      <ReportsTable items={[]} isLoading isError={false} isDownloading={false} {...actions} />
    );
    expect(screen.getByText("Loading reports")).toBeInTheDocument();
    rerender(
      <ReportsTable items={[]} isLoading={false} isError isDownloading={false} {...actions} />
    );
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(actions.onError).toHaveBeenCalledOnce();
    rerender(
      <ReportsTable
        items={[]}
        isLoading={false}
        isError={false}
        isDownloading={false}
        emptyMessage="Nothing generated"
        {...actions}
      />
    );
    expect(screen.getByText("Nothing generated")).toBeInTheDocument();
  });

  it("sorts reports through ascending, descending and original order", async () => {
    const user = userEvent.setup();
    const actions = handlers();
    render(
      <ReportsTable
        items={[
          report(),
          report({ id: "report-2", reportName: "Alpha Project", createdAt: "2026-01-01T00:00:00Z" }),
        ]}
        isLoading={false}
        isError={false}
        isDownloading={false}
        {...actions}
      />
    );
    const names = () => screen.getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell")[0].textContent);
    expect(names()).toEqual(["Zeta Project", "Alpha Project"]);
    await user.click(screen.getByRole("button", { name: /Project/ }));
    expect(names()).toEqual(["Alpha Project", "Zeta Project"]);
    await user.click(screen.getByRole("button", { name: /Project/ }));
    expect(names()).toEqual(["Zeta Project", "Alpha Project"]);
    await user.click(screen.getByRole("button", { name: /Project/ }));
    expect(names()).toEqual(["Zeta Project", "Alpha Project"]);
    await user.click(screen.getByRole("button", { name: /Status/ }));
    await user.click(screen.getByRole("button", { name: /Created At/ }));
    expect(names()).toEqual(["Alpha Project", "Zeta Project"]);
  });

  it("downloads and archives active reports", async () => {
    const user = userEvent.setup();
    const actions = handlers();
    render(
      <ReportsTable
        items={[report()]}
        isLoading={false}
        isError={false}
        isDownloading={false}
        {...actions}
      />
    );
    expect(screen.getByText("Attempt 1")).toBeInTheDocument();
    expect(screen.getByText("audit-1@2")).toHaveAttribute("title", "audit-1@2");
    await user.click(screen.getByRole("button", { name: "Download report" }));
    await user.click(screen.getByRole("button", { name: "Archive report version" }));
    expect(actions.onDownload).toHaveBeenCalledWith("report-1");
    expect(actions.onDelete).toHaveBeenCalledWith("report-1");
  });

  it("restores archived reports and disables unavailable operations", async () => {
    const user = userEvent.setup();
    const actions = handlers();
    const { rerender } = render(
      <ReportsTable
        items={[report({ archivedAt: "2026-09-06", includedAudits: [], reportUrl: null })]}
        isLoading={false}
        isError={false}
        isDownloading={false}
        {...actions}
      />
    );
    expect(screen.getByText("No manifest details")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Report not available yet" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Restore report version" }));
    expect(actions.onRestore).toHaveBeenCalledWith("report-1");

    session.isAdmin = false;
    rerender(
      <ReportsTable
        items={[report()]}
        isLoading={false}
        isError={false}
        isDownloading
        deletingId="report-1"
        {...actions}
      />
    );
    expect(screen.getByRole("button", { name: "Download report" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Archive report version" })).toBeDisabled();
  });

  it("composes the report list card with summary and action slot", () => {
    render(
      <ReportsListCard
        items={[report()]}
        totalCount={1}
        rightSlot={<button>Export</button>}
        isLoading={false}
        isError={false}
        isDownloading={false}
        {...handlers()}
      />
    );
    expect(screen.getByText("All Reports (1)")).toBeInTheDocument();
    expect(screen.getByText("Complete list of generated audit reports")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
  });

  it("updates the report search query", async () => {
    const onQueryChange = vi.fn();
    render(<ReportsSearchCard query="" onQueryChange={onQueryChange} />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "alpha" } });
    expect(onQueryChange).toHaveBeenCalledWith("alpha");
    expect(input).toHaveAttribute("placeholder", "Search by project name, auditor, or report ID…");
  });
});
