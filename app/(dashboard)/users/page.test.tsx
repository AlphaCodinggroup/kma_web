import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: {} as any,
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@features/users/ui/hooks/useUsersQuery", () => ({ useUsersQuery: () => mocks.query }));
vi.mock("@features/users/api/users.repo.impl", () => ({ usersRepoImpl: { createUser: mocks.create, updateUser: mocks.update, deleteUser: mocks.remove } }));
vi.mock("@shared/ui/page-header", () => ({
  default: ({ title, subtitle, primaryAction }: any) => <header><h1>{title}</h1><p>{subtitle}</p><button onClick={primaryAction.onClick}>{primaryAction.label}</button></header>,
}));
vi.mock("@features/users/ui/UsersMetrics", () => ({ default: ({ metrics }: any) => <div data-testid="user-metrics">{JSON.stringify(metrics)}</div> }));
vi.mock("@features/users/ui/UsersSearchCard", () => ({
  default: ({ query, onQueryChange, total, children }: any) => <section data-total={total}><input aria-label="User search" value={query} onChange={(event) => onQueryChange(event.target.value)} />{children}</section>,
}));
vi.mock("@features/users/ui/UsersTable", () => ({
  default: ({ items, onEdit, onDelete, isError, isLoading, onError }: any) => (
    <div data-testid="users-table" data-items={items.map((item: any) => item.id).join(",")} data-error={isError} data-loading={isLoading}>
      <button onClick={onError}>Reload users</button>
      <button onClick={() => onEdit("user-1")}>Edit user</button>
      <button onClick={() => onEdit("missing")}>Edit missing</button>
      <button onClick={() => onDelete("user-1")}>Delete user row</button>
    </div>
  ),
}));
vi.mock("@features/users/ui/CreateUserDialog", () => ({
  default: ({ open, onOpenChange, onSubmit, loading, error, defaultValues }: any) => open ? (
    <div data-testid="create-user-dialog" data-loading={loading} data-error={error ?? ""} data-defaults={JSON.stringify(defaultValues ?? {})}>
      <button onClick={() => onSubmit({ name: "New User", email: "new@example.com", role: "auditor", password: "secret" })}>Submit user</button>
      <button onClick={() => onOpenChange(false)}>Cancel user</button>
    </div>
  ) : null,
}));
vi.mock("@shared/ui/confirm-dialog", () => ({
  default: ({ open, title, description, onConfirm, onOpenChange, loading }: any) => open ? (
    <div data-testid="confirm-user" data-loading={loading}><h2>{title}</h2><div>{description}</div><button onClick={onConfirm}>Confirm delete</button><button onClick={() => onOpenChange(false)}>Cancel delete</button></div>
  ) : null,
}));

import UsersPage from "./page";

const users = [
  { id: "user-1", name: "Alice Admin", email: "alice@example.com", role: "admin" },
  { id: "user-2", name: "Bob Auditor", email: "bob@example.com", role: "auditor" },
  { id: "user-3", name: "Quinn QC", email: "quinn@example.com", role: "qc_manager" },
];

describe("UsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query = { data: { items: users }, isLoading: false, isError: false, refetch: vi.fn() };
    mocks.create.mockResolvedValue({});
    mocks.update.mockResolvedValue({});
    mocks.remove.mockResolvedValue({});
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("computes role metrics, filters users and refreshes errors", async () => {
    const user = userEvent.setup();
    render(<UsersPage />);
    expect(screen.getByTestId("user-metrics")).toHaveTextContent('"totalUsers":3');
    expect(screen.getByTestId("user-metrics")).toHaveTextContent('"auditors":1');
    await user.type(screen.getByRole("textbox", { name: "User search" }), "bob@");
    expect(screen.getByTestId("users-table")).toHaveAttribute("data-items", "user-2");
    await user.click(screen.getByRole("button", { name: "Reload users" }));
    expect(mocks.query.refetch).toHaveBeenCalled();
  });

  it("recomputes metrics when roles change at the same user count", () => {
    const { rerender } = render(<UsersPage />);
    expect(screen.getByTestId("user-metrics")).toHaveTextContent('"auditors":1');
    mocks.query = { ...mocks.query, data: { items: users.map((item) => ({ ...item, role: "auditor" })) } };
    rerender(<UsersPage />);
    expect(screen.getByTestId("user-metrics")).toHaveTextContent('"auditors":3');
  });

  it("creates a user and shows the success dialog", async () => {
    const user = userEvent.setup();
    render(<UsersPage />);
    await user.click(screen.getByRole("button", { name: "Add User" }));
    await user.click(screen.getByRole("button", { name: "Submit user" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalled());
    expect(await screen.findByRole("heading", { name: "User Created" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("heading", { name: "User Created" })).not.toBeInTheDocument();
  });

  it("edits a user and includes an optional password", async () => {
    const user = userEvent.setup();
    render(<UsersPage />);
    await user.click(screen.getByRole("button", { name: "Edit user" }));
    expect(screen.getByTestId("create-user-dialog")).toHaveAttribute("data-defaults", expect.stringContaining("alice@example.com"));
    await user.click(screen.getByRole("button", { name: "Submit user" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith("user-1", expect.objectContaining({ password: "secret" })));
    expect(await screen.findByRole("heading", { name: "User Updated" })).toBeInTheDocument();
  });

  it("keeps the form open and displays save failures", async () => {
    const user = userEvent.setup();
    mocks.create.mockRejectedValue(new Error("Email already exists"));
    render(<UsersPage />);
    await user.click(screen.getByRole("button", { name: "Add User" }));
    await user.click(screen.getByRole("button", { name: "Submit user" }));
    await waitFor(() => expect(screen.getByTestId("create-user-dialog")).toHaveAttribute("data-error", "Email already exists"));
    await user.click(screen.getByRole("button", { name: "Cancel user" }));
    expect(screen.queryByTestId("create-user-dialog")).not.toBeInTheDocument();
  });

  it("deletes, cancels and visibly reports delete failures", async () => {
    const user = userEvent.setup();
    render(<UsersPage />);
    await user.click(screen.getByRole("button", { name: "Delete user row" }));
    expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel delete" }));
    expect(screen.queryByTestId("confirm-user")).not.toBeInTheDocument();

    mocks.remove.mockRejectedValueOnce(new Error("Delete conflict"));
    await user.click(screen.getByRole("button", { name: "Delete user row" }));
    await user.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Delete conflict");
    await user.click(screen.getByRole("button", { name: "Confirm delete" }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledTimes(2));
    expect(mocks.query.refetch).toHaveBeenCalled();
  });

  it("forwards loading and error states", () => {
    mocks.query = { data: undefined, isLoading: true, isError: true, refetch: vi.fn() };
    render(<UsersPage />);
    expect(screen.getByTestId("users-table")).toHaveAttribute("data-loading", "true");
    expect(screen.getByTestId("users-table")).toHaveAttribute("data-error", "true");
    fireEvent.click(screen.getByRole("button", { name: "Edit missing" }));
    expect(screen.queryByTestId("create-user-dialog")).not.toBeInTheDocument();
  });
});
