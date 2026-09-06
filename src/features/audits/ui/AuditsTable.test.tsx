import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Audit } from "@entities/audit/model";

const mocks = vi.hoisted(() => ({
  isAdmin: true,
  details: {} as Record<string, any>,
  useAuditDetail: vi.fn(),
}));
vi.mock("@processes/auth/hooks", () => ({ useSession: () => ({ isAdmin: mocks.isAdmin }) }));
vi.mock("@features/audits/lib/hooks/useAuditDetail", () => ({
  useAuditDetail: (id: string | undefined, options: unknown) => {
    mocks.useAuditDetail(id, options);
    return { data: id ? mocks.details[id] : undefined };
  },
}));
vi.mock("@shared/ui/Pagination", () => ({
  default: ({ currentPage, totalPages, pageSize, totalItems, onPageChange, onPageSizeChange }: any) => (
    <div data-testid="table-pagination" data-page={currentPage} data-pages={totalPages} data-size={pageSize} data-total={totalItems}>
      <button onClick={() => onPageChange(2)}>Page 2</button>
      <button onClick={() => onPageSizeChange(50)}>Size 50</button>
    </div>
  ),
}));

import AuditsTable from "./AuditsTable";

const first: Audit = {
  id: "audit-b",
  flowId: "flow-b",
  flowName: "Zulu flow",
  version: 2,
  projectId: "project-b",
  facilityId: "facility-b",
  status: "completed",
  createdBy: "user-b",
  updatedBy: "user-b",
  createdAt: "2026-02-02T10:00:00Z",
  updatedAt: "2026-02-02T10:00:00Z",
  projectName: "Zulu project",
  auditorName: "Zoe",
  facilityName: "Zulu facility",
  findingsCount: 2,
};
const second: Audit = {
  ...first,
  id: "audit-a",
  flowId: "flow-a",
  flowName: "Alpha flow",
  version: 1,
  projectId: "project-a",
  facilityId: "facility-a",
  status: "audit_in_progress",
  createdAt: "2026-01-01T10:00:00Z",
  projectName: "Alpha project",
  auditorName: "Amy",
  facilityName: "Alpha facility",
  findingsCount: 0,
};

function firstProjectCell() {
  const rows = screen.getAllByRole("row");
  return within(rows[1]).getAllByRole("cell")[0].textContent;
}

describe("AuditsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAdmin = true;
    mocks.details = {
      "audit-a": {
        questions: [
          { answer: "yes" },
          { answer: "YES" },
        ],
      },
    };
  });
  afterEach(() => cleanup());

  it("sorts every column and cycles ascending, descending and original order", async () => {
    const user = userEvent.setup();
    render(<AuditsTable items={[first, second]} onError={vi.fn()} />);
    expect(firstProjectCell()).toBe("Zulu project");
    await user.click(screen.getByRole("button", { name: "Project" }));
    expect(firstProjectCell()).toBe("Alpha project");
    await user.click(screen.getByRole("button", { name: "Project" }));
    expect(firstProjectCell()).toBe("Zulu project");
    await user.click(screen.getByRole("button", { name: "Project" }));
    expect(firstProjectCell()).toBe("Zulu project");

    for (const name of ["Facility", "Flow", "Auditor", "Status", "Audit Date"]) {
      await user.click(screen.getByRole("button", { name }));
      expect(firstProjectCell()).toBe("Alpha project");
    }
  });

  it("marks only nonempty all-YES audits as fully compliant", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<AuditsTable items={[second]} onEdit={onEdit} onError={vi.fn()} />);
    const edit = screen.getByRole("button", { name: "Edit audit" });
    expect(edit).toHaveAttribute("title", "No findings, unsures, or blanks - fully compliant");
    await user.click(edit);
    expect(onEdit).toHaveBeenCalledWith(second, true);
    expect(mocks.useAuditDetail).toHaveBeenCalledWith("audit-a", expect.objectContaining({ enabled: true }));

    cleanup();
    mocks.details["audit-a"] = { questions: [] };
    render(<AuditsTable items={[second]} onEdit={onEdit} onError={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Edit audit" })).toHaveAttribute("title", "Edit audit");
  });

  it("runs edit and delete actions and exposes in-progress controls", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const { rerender } = render(
      <AuditsTable items={[first]} onEdit={onEdit} onDelete={onDelete} onError={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: "Edit audit" }));
    await user.click(screen.getByRole("button", { name: "Delete audit" }));
    expect(onEdit).toHaveBeenCalledWith(first, false);
    expect(onDelete).toHaveBeenCalledWith(first);

    rerender(
      <AuditsTable items={[first]} onEdit={onEdit} onDelete={onDelete} editingId="audit-b" deletingId="audit-b" onError={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Edit audit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete audit" })).toBeDisabled();
  });

  it("prevents viewer mutations", () => {
    mocks.isAdmin = false;
    render(<AuditsTable items={[first]} onDelete={vi.fn()} onError={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Edit audit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit audit" })).toHaveAttribute("title", "Only administrators can edit audits");
    expect(screen.getByRole("button", { name: "Delete audit" })).toBeDisabled();
  });

  it("renders loading, retry, updating and custom empty states", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const { rerender } = render(<AuditsTable items={[]} loading onError={onError} />);
    expect(screen.getByText("Loading audits…")).toBeInTheDocument();
    rerender(<AuditsTable items={[]} error onError={onError} />);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onError).toHaveBeenCalledOnce();
    rerender(<AuditsTable items={[]} fetching emptyMessage="No matching audit" onError={onError} />);
    expect(screen.getByText("Updating...")).toBeInTheDocument();
    expect(screen.getByText("No matching audit")).toBeInTheDocument();
  });

  it("connects pagination only when callbacks and items are available", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(
      <AuditsTable
        items={[first]}
        onError={vi.fn()}
        currentPage={1}
        totalPages={3}
        pageSize={25}
        totalItems={60}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    expect(screen.getByTestId("table-pagination")).toHaveAttribute("data-total", "60");
    await user.click(screen.getByRole("button", { name: "Page 2" }));
    await user.click(screen.getByRole("button", { name: "Size 50" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it("sorts descending on every column", () => {
    render(<AuditsTable items={[second, first]} onError={vi.fn()} />);

    for (const name of ["Project", "Facility", "Flow", "Auditor", "Status", "Audit Date"]) {
      fireEvent.click(screen.getByRole("button", { name }));
      expect(firstProjectCell()).toBe("Alpha project");
      fireEvent.click(screen.getByRole("button", { name }));
      expect(firstProjectCell()).toBe("Zulu project");
      fireEvent.click(screen.getByRole("button", { name }));
    }
  });

  it("keeps equal rows in place", () => {
    const twin = { ...first, id: "audit-c" };
    render(<AuditsTable items={[first, twin]} onError={vi.fn()} />);

    for (const name of ["Project", "Facility", "Flow", "Auditor", "Status", "Audit Date"]) {
      fireEvent.click(screen.getByRole("button", { name }));
      expect(firstProjectCell()).toBe("Zulu project");
      fireEvent.click(screen.getByRole("button", { name }));
      fireEvent.click(screen.getByRole("button", { name }));
    }
  });

  it("falls back to a dash on every missing column", () => {
    const bare = {
      ...second,
      projectName: undefined,
      facilityName: undefined,
      flowName: undefined,
      auditorName: undefined,
      createdAt: "",
    } as unknown as Audit;
    render(<AuditsTable items={[bare]} onError={vi.fn()} />);

    const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
    expect(cells.slice(0, 4).map((cell) => cell.textContent)).toEqual(["—", "—", "—", "—"]);
    expect(cells[5].textContent).toMatch(/^[—-]$/);
  });

  it("sorts the missing values of every column", () => {
    const bare = {
      ...second,
      id: "audit-bare",
      projectName: undefined,
      facilityName: undefined,
      flowName: undefined,
      auditorName: undefined,
      status: undefined,
    } as unknown as Audit;
    render(<AuditsTable items={[first, bare]} onError={vi.fn()} />);

    for (const name of ["Project", "Facility", "Flow", "Auditor", "Status"]) {
      fireEvent.click(screen.getByRole("button", { name }));
      expect(firstProjectCell()).toBe("—");
      fireEvent.click(screen.getByRole("button", { name }));
      fireEvent.click(screen.getByRole("button", { name }));
    }
  });

  it("treats a blank answer as non compliant", () => {
    mocks.details["audit-a"] = { questions: [{ answer: "yes" }, { answer: null }] };
    render(<AuditsTable items={[second]} onError={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Edit audit" })).toHaveAttribute("title", "Edit audit");
  });

  it("treats a detail without questions as non compliant", () => {
    mocks.details["audit-a"] = {};
    render(<AuditsTable items={[second]} onError={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Edit audit" })).toHaveAttribute("title", "Edit audit");
  });

  it("never fetches the detail of an audit that already has findings", () => {
    render(<AuditsTable items={[first]} onError={vi.fn()} />);
    expect(mocks.useAuditDetail).toHaveBeenCalledWith(undefined, expect.objectContaining({ enabled: false }));
  });
});
