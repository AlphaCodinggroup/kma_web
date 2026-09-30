/**
 * Tabla del listado de auditorías: filas, orden por columna, estados de carga,
 * error y vacío, paginación y el chequeo de cumplimiento que decide si el botón
 * de edición avisa que no hace falta reporte.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Audit } from "@entities/audit/model";

// ---- mocks ----

const useSessionMock = vi.fn();
vi.mock("@processes/auth/hooks", () => ({
  useSession: () => useSessionMock(),
}));

type DetailStub = { questions?: { type: string; answer?: unknown }[] };

const useAuditDetailMock = vi.fn();
vi.mock("@features/audits/lib/hooks/useAuditDetail", () => ({
  useAuditDetail: (...args: unknown[]) => useAuditDetailMock(...args),
}));

// ---- import after mocks ----
import AuditsTable from "../AuditsTable";

const makeAudit = (overrides: Partial<Audit> = {}): Audit => ({
  id: "audit-1",
  flowId: "flow-1",
  flowName: "Ramps",
  version: 1,
  projectId: "project-1",
  facilityId: "facility-1",
  status: "draft_report_pending_review",
  createdBy: "user-1",
  updatedBy: "user-1",
  createdAt: "2026-01-15T10:30:00Z",
  updatedAt: "2026-01-16T10:30:00Z",
  projectName: "Downtown Retrofit",
  auditorName: "Ada Lovelace",
  facilityName: "Warehouse 7",
  findingsCount: 3,
  ...overrides,
});

/** Devuelve los ids de auditoría en el orden en que se pintaron las filas. */
const renderedRowIds = (container: HTMLElement): string[] =>
  Array.from(container.querySelectorAll('[data-testid^="audit-row-"]')).map(
    (row) => row.getAttribute("data-testid") ?? ""
  );

const iconClassOf = (el: HTMLElement): string =>
  el.querySelector("svg")?.getAttribute("class") ?? "";

/** Nombre exacto del ícono lucide, sin las clases de tamaño ni de color. */
const iconNameOf = (el: HTMLElement): string =>
  iconClassOf(el)
    .split(" ")
    .filter((c) => c.startsWith("lucide-"))
    .join(" ");

const withDetail = (detail: DetailStub | undefined) => {
  useAuditDetailMock.mockImplementation((auditId?: string) => ({
    data: auditId ? detail : undefined,
  }));
};

beforeEach(() => {
  vi.clearAllMocks();
  useSessionMock.mockReturnValue({ isAdmin: true });
  withDetail(undefined);
});

describe("AuditsTable — rows", () => {
  it("renders every column of a row", () => {
    render(
      <AuditsTable items={[makeAudit()]} onError={vi.fn()} />
    );

    const row = screen.getByTestId("audit-row-audit-1");
    expect(within(row).getByText("Downtown Retrofit")).toBeInTheDocument();
    expect(within(row).getByText("Warehouse 7")).toBeInTheDocument();
    expect(within(row).getByText("Ramps")).toBeInTheDocument();
    expect(within(row).getByText("Ada Lovelace")).toBeInTheDocument();
    expect(
      within(row).getByText("Draft Report Pending Review")
    ).toBeInTheDocument();
    expect(within(row).getByText("2026-01-15 10:30")).toBeInTheDocument();
  });

  it("falls back to an em dash for the missing text columns", () => {
    render(
      <AuditsTable
        items={[
          makeAudit({
            projectName: null,
            facilityName: null,
            flowName: null,
            auditorName: null,
          }),
        ]}
        onError={vi.fn()}
      />
    );

    const row = screen.getByTestId("audit-row-audit-1");
    expect(within(row).getAllByText("—")).toHaveLength(4);
  });

  it("renders a short dash when there is no creation date", () => {
    render(
      <AuditsTable items={[makeAudit({ createdAt: "" })]} onError={vi.fn()} />
    );

    expect(
      within(screen.getByTestId("audit-row-audit-1")).getByText("-")
    ).toBeInTheDocument();
  });

  it("renders one row per audit", () => {
    const { container } = render(
      <AuditsTable
        items={[
          makeAudit({ id: "a" }),
          makeAudit({ id: "b" }),
          makeAudit({ id: "c" }),
        ]}
        onError={vi.fn()}
      />
    );

    expect(renderedRowIds(container)).toEqual([
      "audit-row-a",
      "audit-row-b",
      "audit-row-c",
    ]);
  });

  it("renders every sortable column header", () => {
    render(<AuditsTable items={[makeAudit()]} onError={vi.fn()} />);

    for (const name of [
      "Project",
      "Facility",
      "Flow",
      "Auditor",
      "Status",
      "Audit Date",
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("uses the default body height class and honours the override", () => {
    const { container, unmount } = render(
      <AuditsTable items={[makeAudit()]} onError={vi.fn()} />
    );
    expect(container.querySelector(".max-h-dvh")).toBeInTheDocument();
    unmount();

    const second = render(
      <AuditsTable
        items={[makeAudit()]}
        onError={vi.fn()}
        bodyMaxHeightClassName="max-h-96"
      />
    );
    expect(second.container.querySelector(".max-h-96")).toBeInTheDocument();
    expect(second.container.querySelector(".max-h-dvh")).not.toBeInTheDocument();
  });
});

describe("AuditsTable — empty, loading and error states", () => {
  it("shows the default empty message", () => {
    render(<AuditsTable items={[]} onError={vi.fn()} />);

    expect(screen.getByText("No audits found")).toBeInTheDocument();
  });

  it("shows a custom empty message", () => {
    render(
      <AuditsTable
        items={[]}
        onError={vi.fn()}
        emptyMessage="Nothing matches the filters"
      />
    );

    expect(
      screen.getByText("Nothing matches the filters")
    ).toBeInTheDocument();
  });

  it("shows the loading state instead of the table", () => {
    render(<AuditsTable items={[makeAudit()]} onError={vi.fn()} loading />);

    expect(screen.getByText("Loading audits…")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the retry block on error and calls onError", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    render(<AuditsTable items={[makeAudit()]} onError={onError} error />);

    expect(
      screen.getByText("Failed to load audits. Please try again.")
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("shows the updating overlay while refetching", () => {
    render(<AuditsTable items={[makeAudit()]} onError={vi.fn()} fetching />);

    expect(screen.getByText("Updating...")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("hides the updating overlay while the first load runs", () => {
    render(
      <AuditsTable items={[makeAudit()]} onError={vi.fn()} fetching loading />
    );

    expect(screen.queryByText("Updating...")).not.toBeInTheDocument();
  });
});

describe("AuditsTable — compliance check on the edit button", () => {
  const complianceRow = [makeAudit({ findingsCount: 0 })];

  it("does not fetch the detail when the audit already has findings", () => {
    render(
      <AuditsTable
        items={[makeAudit({ findingsCount: 3 })]}
        onError={vi.fn()}
      />
    );

    expect(useAuditDetailMock).toHaveBeenCalledWith(undefined, {
      enabled: false,
      staleTime: Infinity,
    });
    expect(screen.getByRole("button", { name: "Edit audit" })).toHaveAttribute(
      "title",
      "Edit audit"
    );
  });

  it("does not fetch the detail when the findings count is unknown", () => {
    render(
      <AuditsTable
        items={[makeAudit({ findingsCount: null })]}
        onError={vi.fn()}
      />
    );

    expect(useAuditDetailMock).toHaveBeenCalledWith(undefined, {
      enabled: false,
      staleTime: Infinity,
    });
  });

  it("fetches the detail when there are no findings", () => {
    render(<AuditsTable items={complianceRow} onError={vi.fn()} />);

    expect(useAuditDetailMock).toHaveBeenCalledWith("audit-1", {
      enabled: true,
      staleTime: Infinity,
    });
  });

  it("marks the audit as compliant when every yes_no answer is the boolean true", () => {
    // El mapper de detalle normaliza "YES" a `true`: ese es el caso real.
    withDetail({
      questions: [
        { type: "yes_no", answer: true },
        { type: "yes_no", answer: true },
      ],
    });
    render(<AuditsTable items={complianceRow} onError={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Edit audit" })).toHaveAttribute(
      "title",
      "No findings, unsures, or blanks - fully compliant"
    );
  });

  it("accepts the affirmative string variants", () => {
    withDetail({
      questions: [
        { type: "yes_no", answer: "YES" },
        { type: "yes_no", answer: "yes" },
        { type: "yes_no", answer: " TRUE " },
        { type: "yes_no", answer: "SI" },
      ],
    });
    render(<AuditsTable items={complianceRow} onError={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Edit audit" })).toHaveAttribute(
      "title",
      "No findings, unsures, or blanks - fully compliant"
    );
  });

  it("ignores the steps that are not yes/no questions", () => {
    withDetail({
      questions: [
        { type: "yes_no", answer: true },
        { type: "form" },
        { type: "multiple_choice", answer: "Concrete" },
      ],
    });
    render(<AuditsTable items={complianceRow} onError={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Edit audit" })).toHaveAttribute(
      "title",
      "No findings, unsures, or blanks - fully compliant"
    );
  });

  it.each([
    ["the boolean false", false],
    ["the string NO", "NO"],
    ["the string FALSE", "FALSE"],
    ["UNSURE", "UNSURE"],
    ["an unknown value", "maybe"],
    ["null", null],
    ["undefined", undefined],
  ])("is not compliant when an answer is %s", (_label, answer) => {
    withDetail({
      questions: [
        { type: "yes_no", answer: true },
        { type: "yes_no", answer },
      ],
    });
    render(<AuditsTable items={complianceRow} onError={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Edit audit" })).toHaveAttribute(
      "title",
      "Edit audit"
    );
  });

  it("is not compliant when the detail has no yes/no questions", () => {
    withDetail({ questions: [{ type: "form" }] });
    render(<AuditsTable items={complianceRow} onError={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Edit audit" })).toHaveAttribute(
      "title",
      "Edit audit"
    );
  });

  it("is not compliant when the detail carries no questions field", () => {
    withDetail({});
    render(<AuditsTable items={complianceRow} onError={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Edit audit" })).toHaveAttribute(
      "title",
      "Edit audit"
    );
  });

  it("is not compliant while the detail is still loading", () => {
    useAuditDetailMock.mockReturnValue({ data: undefined });
    render(<AuditsTable items={complianceRow} onError={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Edit audit" })).toHaveAttribute(
      "title",
      "Edit audit"
    );
  });

  it("passes the compliant flag to onEdit", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    withDetail({ questions: [{ type: "yes_no", answer: true }] });
    const row = makeAudit({ findingsCount: 0 });

    render(<AuditsTable items={[row]} onEdit={onEdit} onError={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Edit audit" }));

    expect(onEdit).toHaveBeenCalledWith(row, true);
  });

  it("passes false to onEdit when the audit is not compliant", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const row = makeAudit();

    render(<AuditsTable items={[row]} onEdit={onEdit} onError={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Edit audit" }));

    expect(onEdit).toHaveBeenCalledWith(row, false);
  });
});

describe("AuditsTable — row actions", () => {
  it("keeps the edit button inert when there is no onEdit handler", async () => {
    const user = userEvent.setup();
    render(<AuditsTable items={[makeAudit()]} onError={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Edit audit" }));

    expect(screen.getByTestId("audit-row-audit-1")).toBeInTheDocument();
  });

  it("shows a spinner and disables the edit button for the audit being opened", () => {
    render(
      <AuditsTable
        items={[makeAudit()]}
        onEdit={vi.fn()}
        editingId="audit-1"
        onError={vi.fn()}
      />
    );

    const button = screen.getByRole("button", { name: "Edit audit" });
    expect(button).toBeDisabled();
    expect(iconClassOf(button)).toContain("lucide-loader-circle");
  });

  it("keeps the pencil icon for the rows that are not being opened", () => {
    render(
      <AuditsTable
        items={[makeAudit()]}
        onEdit={vi.fn()}
        editingId="other"
        onError={vi.fn()}
      />
    );

    const button = screen.getByRole("button", { name: "Edit audit" });
    expect(button).not.toBeDisabled();
    expect(iconClassOf(button)).toContain("lucide-pencil");
  });

  it("disables both actions for non administrators", () => {
    useSessionMock.mockReturnValue({ isAdmin: false });
    render(
      <AuditsTable
        items={[makeAudit()]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onError={vi.fn()}
      />
    );

    const edit = screen.getByRole("button", { name: "Edit audit" });
    const remove = screen.getByRole("button", { name: "Delete audit" });
    expect(edit).toBeDisabled();
    expect(edit).toHaveAttribute("title", "Only administrators can edit audits");
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute(
      "title",
      "Only administrators can delete audits"
    );
  });

  it("calls onDelete with the row", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const row = makeAudit();

    render(<AuditsTable items={[row]} onDelete={onDelete} onError={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Delete audit" }));

    expect(onDelete).toHaveBeenCalledWith(row);
  });

  it("shows a spinner and disables the delete button while deleting", () => {
    render(
      <AuditsTable
        items={[makeAudit()]}
        onDelete={vi.fn()}
        deletingId="audit-1"
        onError={vi.fn()}
      />
    );

    const remove = screen.getByRole("button", { name: "Delete audit" });
    expect(remove).toBeDisabled();
    expect(remove.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("keeps the trash icon for the rows that are not being deleted", () => {
    render(
      <AuditsTable
        items={[makeAudit()]}
        onDelete={vi.fn()}
        deletingId="other"
        onError={vi.fn()}
      />
    );

    const remove = screen.getByRole("button", { name: "Delete audit" });
    expect(remove).not.toBeDisabled();
    expect(iconClassOf(remove)).toContain("lucide-trash");
  });

  it("hides the delete button when there is no onDelete handler", () => {
    render(<AuditsTable items={[makeAudit()]} onError={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: "Delete audit" })
    ).not.toBeInTheDocument();
  });
});

describe("AuditsTable — sorting", () => {
  const items = [
    makeAudit({
      id: "b",
      projectName: "Beta",
      facilityName: "Bravo",
      flowName: "Bathrooms",
      auditorName: "Bob",
      status: "draft_report_in_review",
      createdAt: "2026-02-01T00:00:00Z",
    }),
    makeAudit({
      id: "a",
      projectName: "Alpha",
      facilityName: "Alfa",
      flowName: "Aisles",
      auditorName: "Ann",
      status: "completed",
      createdAt: "2026-01-01T00:00:00Z",
    }),
    makeAudit({
      id: "c",
      projectName: "Gamma",
      facilityName: "Charlie",
      flowName: "Curbs",
      auditorName: "Cid",
      status: "final_report_sent_to_client",
      createdAt: "2026-03-01T00:00:00Z",
    }),
  ];

  it.each([
    ["Project", ["audit-row-a", "audit-row-b", "audit-row-c"]],
    ["Facility", ["audit-row-a", "audit-row-b", "audit-row-c"]],
    ["Flow", ["audit-row-a", "audit-row-b", "audit-row-c"]],
    ["Auditor", ["audit-row-a", "audit-row-b", "audit-row-c"]],
    ["Audit Date", ["audit-row-a", "audit-row-b", "audit-row-c"]],
  ])("sorts ascending by %s on the first click", async (column, expected) => {
    const user = userEvent.setup();
    const { container } = render(
      <AuditsTable items={items} onError={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: column as string }));

    expect(renderedRowIds(container)).toEqual(expected);
  });

  it("sorts ascending by status", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AuditsTable items={items} onError={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: "Status" }));

    // completed < draft_report_in_review < final_report_sent_to_client
    expect(renderedRowIds(container)).toEqual([
      "audit-row-a",
      "audit-row-b",
      "audit-row-c",
    ]);
  });

  it("cycles ascending, descending and back to the original order", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AuditsTable items={items} onError={vi.fn()} />
    );
    const header = screen.getByRole("button", { name: "Project" });

    expect(iconNameOf(header)).toBe("lucide-arrow-up-down");

    await user.click(header);
    expect(renderedRowIds(container)).toEqual([
      "audit-row-a",
      "audit-row-b",
      "audit-row-c",
    ]);
    expect(iconNameOf(header)).toBe("lucide-arrow-up");

    await user.click(header);
    expect(renderedRowIds(container)).toEqual([
      "audit-row-c",
      "audit-row-b",
      "audit-row-a",
    ]);
    expect(iconNameOf(header)).toBe("lucide-arrow-down");

    await user.click(header);
    expect(renderedRowIds(container)).toEqual([
      "audit-row-b",
      "audit-row-a",
      "audit-row-c",
    ]);
    expect(iconNameOf(header)).toBe("lucide-arrow-up-down");
  });

  it("restarts the cycle when a different column is picked", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AuditsTable items={items} onError={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: "Project" }));
    await user.click(screen.getByRole("button", { name: "Project" }));
    await user.click(screen.getByRole("button", { name: "Audit Date" }));

    expect(renderedRowIds(container)).toEqual([
      "audit-row-a",
      "audit-row-b",
      "audit-row-c",
    ]);
    expect(
      iconNameOf(screen.getByRole("button", { name: "Audit Date" }))
    ).toBe("lucide-arrow-up");
    expect(iconNameOf(screen.getByRole("button", { name: "Project" }))).toBe(
      "lucide-arrow-up-down"
    );
  });

  it("sorts the rows with missing values first", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AuditsTable
        items={[
          makeAudit({ id: "named", projectName: "Alpha" }),
          makeAudit({ id: "blank", projectName: null }),
        ]}
        onError={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Project" }));

    expect(renderedRowIds(container)).toEqual([
      "audit-row-blank",
      "audit-row-named",
    ]);
  });

  it("keeps equal values in their original order", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AuditsTable
        items={[
          makeAudit({ id: "first", projectName: "Same" }),
          makeAudit({ id: "second", projectName: "Same" }),
        ]}
        onError={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Project" }));

    expect(renderedRowIds(container)).toEqual([
      "audit-row-first",
      "audit-row-second",
    ]);
  });
});

describe("AuditsTable — pagination", () => {
  it("renders the pagination bar when both handlers and items are present", () => {
    render(
      <AuditsTable
        items={[makeAudit()]}
        onError={vi.fn()}
        currentPage={2}
        totalPages={4}
        pageSize={10}
        totalItems={35}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />
    );

    expect(screen.getByText("11")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("35")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Next page" })
    ).toBeInTheDocument();
  });

  it("hides the pagination bar when there are no items at all", () => {
    render(
      <AuditsTable
        items={[]}
        onError={vi.fn()}
        totalItems={0}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />
    );

    expect(
      screen.queryByRole("button", { name: "Next page" })
    ).not.toBeInTheDocument();
  });

  it("hides the pagination bar when the page size handler is missing", () => {
    render(
      <AuditsTable
        items={[makeAudit()]}
        onError={vi.fn()}
        totalItems={35}
        onPageChange={vi.fn()}
      />
    );

    expect(
      screen.queryByRole("button", { name: "Next page" })
    ).not.toBeInTheDocument();
  });

  it("reports page and page size changes", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <AuditsTable
        items={[makeAudit()]}
        onError={vi.fn()}
        currentPage={2}
        totalPages={4}
        pageSize={25}
        totalItems={90}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    );

    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await user.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    await user.selectOptions(
      screen.getByLabelText("Items per page:"),
      "50"
    );
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });
});
