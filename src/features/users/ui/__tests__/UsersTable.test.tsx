import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UserSummary } from "@entities/user/list.model";

const isAdminMock = vi.fn<() => boolean>(() => true);

vi.mock("@processes/auth/hooks", () => ({
  useSession: () => ({
    session: { user: null, authenticated: true },
    user: null,
    isAuthenticated: true,
    isAdmin: isAdminMock(),
  }),
}));

import UsersTable, { type UsersTableProps } from "../UsersTable";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Los roles son los grupos de Cognito: auditor, qc y admin.
const users: UserSummary[] = [
  {
    id: "carol",
    cognitoId: "cognito-3",
    name: "Carol Zeta",
    email: "carol@kma.test",
    role: "qc",
  },
  {
    id: "alice",
    cognitoId: "cognito-1",
    name: "Alice Brown",
    email: "zoe@kma.test",
    role: "admin",
  },
  {
    id: "bob",
    cognitoId: "cognito-2",
    name: "Bob Adams",
    email: "bob@kma.test",
    role: "auditor",
  },
];

function renderTable(overrides?: Partial<UsersTableProps>) {
  const props: UsersTableProps = {
    items: users,
    isLoading: false,
    isError: false,
    onError: vi.fn(),
    ...overrides,
  };

  const utils = render(<UsersTable {...props} />);
  return { ...utils, props };
}

/** Devuelve las celdas de la primera columna en el orden pintado. */
function usernameColumn(): string[] {
  const rows = screen.getAllByRole("row").slice(1);
  return rows.map((row) => within(row).getAllByRole("cell")[0]?.textContent ?? "");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("UsersTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAdminMock.mockReturnValue(true);
  });

  it("renders the sortable column headers plus the actions one", () => {
    renderTable();

    expect(screen.getByRole("button", { name: "Username" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Name" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Email Address" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Role" })).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Actions" })
    ).toBeInTheDocument();
  });

  it("renders one row per user with its data", () => {
    renderTable();

    expect(screen.getAllByRole("row")).toHaveLength(users.length + 1);
    expect(screen.getByRole("cell", { name: "Carol Zeta" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "carol@kma.test" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "alice" })).toBeInTheDocument();
  });

  it("renders the role inside a pill", () => {
    renderTable();

    const pill = screen.getByText("auditor");
    expect(pill.tagName).toBe("SPAN");
    expect(pill).toHaveClass("inline-flex", "rounded-full", "border");
  });

  it("omits the role pill when the role is empty", () => {
    renderTable({
      items: [
        {
          id: "noRole",
          cognitoId: "cognito-9",
          name: "No Role",
          email: "norole@kma.test",
          role: "",
        },
      ],
    });

    const row = screen.getAllByRole("row")[1];
    const roleCell = within(row as HTMLElement).getAllByRole("cell")[3];
    expect(roleCell?.textContent).toBe("");
  });

  // -------------------------------------------------------------------------
  // Estados de carga y error
  // -------------------------------------------------------------------------

  it("renders the loading state instead of the table", () => {
    renderTable({ isLoading: true });

    expect(screen.getByText("Loading users…")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders the retry state instead of the table", () => {
    renderTable({ isError: true });

    expect(
      screen.getByText("Failed to load users. Please try again.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("calls onError when the retry button is clicked", async () => {
    const user = userEvent.setup();
    const { props } = renderTable({ isError: true });

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(props.onError).toHaveBeenCalledTimes(1);
  });

  // La carga gana sobre el error cuando ambos flags están activos.
  it("prefers the loading state over the error state", () => {
    renderTable({ isLoading: true, isError: true });

    expect(screen.getByText("Loading users…")).toBeInTheDocument();
    expect(
      screen.queryByText("Failed to load users. Please try again.")
    ).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Estado vacío
  // -------------------------------------------------------------------------

  it("renders the default empty message", () => {
    renderTable({ items: [] });

    expect(screen.getByText("No users found")).toBeInTheDocument();
  });

  it("renders a custom empty message", () => {
    renderTable({ items: [], emptyMessage: "Nothing to show" });

    expect(screen.getByText("Nothing to show")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Ordenamiento
  // -------------------------------------------------------------------------

  it("keeps the original order until a column is sorted", () => {
    renderTable();

    expect(usernameColumn()).toEqual(["carol", "alice", "bob"]);
  });

  const sortableColumns: Array<{
    header: string;
    ascending: string[];
  }> = [
    { header: "Username", ascending: ["alice", "bob", "carol"] },
    { header: "Name", ascending: ["alice", "bob", "carol"] },
    { header: "Email Address", ascending: ["bob", "carol", "alice"] },
    { header: "Role", ascending: ["alice", "bob", "carol"] },
  ];

  it.each(sortableColumns)(
    "sorts by $header ascending on the first click",
    async ({ header, ascending }) => {
      const user = userEvent.setup();
      renderTable();

      await user.click(screen.getByRole("button", { name: header }));

      expect(usernameColumn()).toEqual(ascending);
    }
  );

  it.each(sortableColumns)(
    "sorts by $header descending on the second click",
    async ({ header, ascending }) => {
      const user = userEvent.setup();
      renderTable();

      const trigger = screen.getByRole("button", { name: header });
      await user.click(trigger);
      await user.click(trigger);

      expect(usernameColumn()).toEqual([...ascending].reverse());
    }
  );

  it("clears the sorting on the third click", async () => {
    const user = userEvent.setup();
    renderTable();

    const trigger = screen.getByRole("button", { name: "Username" });
    await user.click(trigger);
    await user.click(trigger);
    await user.click(trigger);

    expect(usernameColumn()).toEqual(["carol", "alice", "bob"]);
  });

  it("restarts ascending when switching to another column", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole("button", { name: "Username" }));
    await user.click(screen.getByRole("button", { name: "Username" }));
    await user.click(screen.getByRole("button", { name: "Email Address" }));

    expect(usernameColumn()).toEqual(["bob", "carol", "alice"]);
  });

  it("keeps equal values in a stable relative order", async () => {
    const user = userEvent.setup();
    renderTable({
      items: [
        { id: "b", cognitoId: "c-b", name: "Same", email: "b@x", role: "qc" },
        { id: "a", cognitoId: "c-a", name: "Same", email: "a@x", role: "qc" },
      ],
    });

    await user.click(screen.getByRole("button", { name: "Name" }));

    expect(usernameColumn()).toEqual(["b", "a"]);
  });

  // -------------------------------------------------------------------------
  // Acciones de fila
  // -------------------------------------------------------------------------

  it("calls onEdit with the user id", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    renderTable({ onEdit });

    const rows = screen.getAllByRole("row").slice(1);
    await user.click(
      within(rows[0] as HTMLElement).getByRole("button", { name: "Edit user" })
    );

    expect(onEdit).toHaveBeenCalledWith("carol");
  });

  it("calls onDelete with the user id so the caller can confirm", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderTable({ onDelete });

    const rows = screen.getAllByRole("row").slice(1);
    await user.click(
      within(rows[1] as HTMLElement).getByRole("button", { name: "Delete user" })
    );

    expect(onDelete).toHaveBeenCalledWith("alice");
  });

  it("does not fail when the action handlers are absent", async () => {
    const user = userEvent.setup();
    renderTable();

    const rows = screen.getAllByRole("row").slice(1);
    const row = rows[0] as HTMLElement;

    await user.click(within(row).getByRole("button", { name: "Edit user" }));
    await user.click(within(row).getByRole("button", { name: "Delete user" }));

    expect(screen.getAllByRole("row")).toHaveLength(users.length + 1);
  });

  it("enables the row actions for an administrator", () => {
    isAdminMock.mockReturnValue(true);
    renderTable({ items: [users[0] as UserSummary] });

    const edit = screen.getByRole("button", { name: "Edit user" });
    const remove = screen.getByRole("button", { name: "Delete user" });
    expect(edit).toBeEnabled();
    expect(edit).toHaveAttribute("title", "Edit user");
    expect(remove).toBeEnabled();
    expect(remove).toHaveAttribute("title", "Delete user");
  });

  it("disables the row actions for a non administrator", () => {
    isAdminMock.mockReturnValue(false);
    renderTable({ items: [users[0] as UserSummary] });

    const edit = screen.getByRole("button", { name: "Edit user" });
    const remove = screen.getByRole("button", { name: "Delete user" });
    expect(edit).toBeDisabled();
    expect(edit).toHaveAttribute("title", "Only administrators can edit users");
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute(
      "title",
      "Only administrators can delete users"
    );
  });

  it("does not invoke the handlers when the actions are disabled", async () => {
    isAdminMock.mockReturnValue(false);
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderTable({ items: [users[0] as UserSummary], onEdit, onDelete });

    await user.click(screen.getByRole("button", { name: "Edit user" }));
    await user.click(screen.getByRole("button", { name: "Delete user" }));

    expect(onEdit).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("paints the delete action with the danger variant", () => {
    renderTable({ items: [users[0] as UserSummary] });

    expect(screen.getByRole("button", { name: "Delete user" })).toHaveClass(
      "text-red-600"
    );
  });

  // -------------------------------------------------------------------------
  // Clases del contenedor
  // -------------------------------------------------------------------------

  it("merges a custom className on the wrapper", () => {
    const { container } = renderTable({ className: "table-extra" });

    expect(container.firstElementChild).toHaveClass(
      "overflow-hidden",
      "rounded-xl",
      "table-extra"
    );
  });

  it("applies the body max height class on the scroll container", () => {
    const { container } = renderTable({
      bodyMaxHeightClassName: "max-h-96",
    });

    expect(container.querySelector(".overflow-y-auto")).toHaveClass("max-h-96");
  });
});
