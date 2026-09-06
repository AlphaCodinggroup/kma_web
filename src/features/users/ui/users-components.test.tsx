import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ isAdmin: true }));

vi.mock("@processes/auth/hooks", () => ({
  useSession: () => session,
}));

import CreateUserDialog from "./CreateUserDialog";
import UsersSearchCard from "./UsersSearchCard";
import UsersTable from "./UsersTable";

const users = [
  { id: "charlie", cognitoId: "cognito-charlie", name: "Same", email: "z@example.com", role: "viewer" },
  { id: "alice", cognitoId: "cognito-alice", name: "Same", email: "a@example.com", role: "admin" },
  { id: "bob", cognitoId: "cognito-bob", name: "Bob", email: "m@example.com", role: "auditor" },
];

const rowIds = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0]?.textContent);

describe("CreateUserDialog", () => {
  afterEach(cleanup);

  it("does not render while closed", () => {
    render(
      <CreateUserDialog
        open={false}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("creates a user with normalized values and every supported role", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <CreateUserDialog
        open
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByRole("heading", { name: "Add New User" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Viewer" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Administrator (legacy role)" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Name"), "  Alice  ");
    await user.type(screen.getByLabelText("Email"), "  ALICE@example.com  ");
    await user.selectOptions(screen.getByLabelText("Role"), "admin");
    await user.type(screen.getByLabelText("Password"), "  secret  ");
    await user.click(screen.getByRole("button", { name: "Create User" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Alice",
      email: "ALICE@example.com",
      role: "admin",
      password: "secret",
    });
  });

  it("treats supplied empty defaults as edit mode and resets when reopened", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const props = {
      onOpenChange: vi.fn(),
      onSubmit,
      defaultValues: { name: "", email: "first@example.com", role: "viewer" },
    };
    const { rerender } = render(<CreateUserDialog open {...props} />);

    expect(screen.getByRole("heading", { name: "Edit User" })).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).not.toBeRequired();
    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "changed@example.com");

    rerender(<CreateUserDialog open={false} {...props} />);
    rerender(
      <CreateUserDialog
        open
        {...props}
        defaultValues={{ name: "Second", email: "second@example.com", role: "auditor" }}
      />
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Second");
    expect(screen.getByLabelText("Email")).toHaveValue("second@example.com");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Second",
      email: "second@example.com",
      role: "auditor",
      password: "",
    });
  });

  it("shows server errors, disables the form while saving and closes explicitly", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <CreateUserDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={vi.fn()}
        loading
        error="Email already exists"
      />
    );

    expect(screen.getByText("Email already exists")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Loading..." })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("UsersTable", () => {
  beforeEach(() => {
    session.isAdmin = true;
  });
  afterEach(cleanup);

  const renderTable = (overrides: Partial<React.ComponentProps<typeof UsersTable>> = {}) => {
    const props: React.ComponentProps<typeof UsersTable> = {
      items: users,
      isLoading: false,
      isError: false,
      onError: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      ...overrides,
    };
    return { ...render(<UsersTable {...props} />), props };
  };

  it("renders loading, error retry and custom empty states", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const { rerender } = render(
      <UsersTable items={[]} isLoading isError={false} onError={onError} />
    );
    expect(screen.getByText("Loading users…")).toBeInTheDocument();

    rerender(<UsersTable items={[]} isLoading={false} isError onError={onError} />);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onError).toHaveBeenCalledOnce();

    rerender(
      <UsersTable
        items={[]}
        emptyMessage="Nothing here"
        isLoading={false}
        isError={false}
        onError={onError}
      />
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("sorts each column, reverses order and restores source order", async () => {
    const user = userEvent.setup();
    renderTable();
    expect(rowIds()).toEqual(["charlie", "alice", "bob"]);

    await user.click(screen.getByRole("button", { name: /Username/ }));
    expect(rowIds()).toEqual(["alice", "bob", "charlie"]);
    await user.click(screen.getByRole("button", { name: /Username/ }));
    expect(rowIds()).toEqual(["charlie", "bob", "alice"]);
    await user.click(screen.getByRole("button", { name: /Username/ }));
    expect(rowIds()).toEqual(["charlie", "alice", "bob"]);

    await user.click(screen.getByRole("button", { name: /^Name/ }));
    expect(rowIds()).toEqual(["bob", "charlie", "alice"]);
    await user.click(screen.getByRole("button", { name: /Email Address/ }));
    expect(rowIds()).toEqual(["alice", "bob", "charlie"]);
    await user.click(screen.getByRole("button", { name: /^Role/ }));
    expect(rowIds()).toEqual(["alice", "bob", "charlie"]);
  });

  it("invokes actions for administrators and disables them for other roles", async () => {
    const user = userEvent.setup();
    const { props, rerender } = renderTable();
    await user.click(screen.getAllByRole("button", { name: "Edit user" })[0]!);
    await user.click(screen.getAllByRole("button", { name: "Delete user" })[0]!);
    expect(props.onEdit).toHaveBeenCalledWith("charlie");
    expect(props.onDelete).toHaveBeenCalledWith("charlie");

    session.isAdmin = false;
    rerender(<UsersTable {...props} />);
    expect(screen.getAllByRole("button", { name: "Edit user" })[0]).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Delete user" })[0]).toBeDisabled();
  });

  it("renders missing optional values without failing", () => {
    renderTable({ items: [{ id: "missing", name: undefined, email: undefined, role: undefined } as any] });
    const row = screen.getAllByRole("row")[1]!;
    expect(within(row).getAllByText("-")).toHaveLength(2);
  });
});

describe("UsersSearchCard", () => {
  afterEach(cleanup);

  it("uses user terminology and forwards the search query", () => {
    const onQueryChange = vi.fn();
    render(
      <UsersSearchCard
        query="ali"
        onQueryChange={onQueryChange}
        total={3}
        placeholder="Find a user"
      >
        <div>Results</div>
      </UsersSearchCard>
    );

    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText(/Total Users:/)).toBeInTheDocument();
    expect(screen.getByText("Results")).toBeInTheDocument();
    const input = screen.getByRole("searchbox", { name: "Search users" });
    expect(input).toHaveValue("ali");
    fireEvent.change(input, { target: { value: "bob" } });
    expect(onQueryChange).toHaveBeenCalledWith("bob");
  });
});
