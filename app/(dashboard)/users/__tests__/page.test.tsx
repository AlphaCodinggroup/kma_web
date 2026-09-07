/**
 * Gestión de usuarios: métricas por rol, búsqueda, alta, edición y borrado.
 *
 * El repositorio se mockea porque la página lo llama directo (no pasa por un
 * caso de uso), y los componentes de feature se stubbean para manejar los
 * diálogos desde el test.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useUsersQuery = vi.fn();
const createUser = vi.fn();
const updateUser = vi.fn();
const deleteUser = vi.fn();

vi.mock("@features/users/ui/hooks/useUsersQuery", () => ({
  useUsersQuery: () => useUsersQuery(),
}));

vi.mock("@features/users/api/users.repo.impl", () => ({
  usersRepoImpl: {
    createUser: (...args: unknown[]) => createUser(...args),
    updateUser: (...args: unknown[]) => updateUser(...args),
    deleteUser: (...args: unknown[]) => deleteUser(...args),
  },
}));

vi.mock("@shared/ui/page-header", () => ({
  default: ({
    title,
    primaryAction,
  }: {
    title: string;
    primaryAction?: { label: string; onClick: () => void };
  }) => (
    <header>
      <h1>{title}</h1>
      {primaryAction ? (
        <button onClick={primaryAction.onClick}>{primaryAction.label}</button>
      ) : null}
    </header>
  ),
}));

vi.mock("@features/users/ui/UsersMetrics", () => ({
  default: ({ metrics }: { metrics: Record<string, number> }) => (
    <dl data-testid="metrics">{JSON.stringify(metrics)}</dl>
  ),
}));

vi.mock("@features/users/ui/UsersSearchCard", () => ({
  default: ({
    query,
    onQueryChange,
    total,
    children,
  }: {
    query: string;
    onQueryChange: (value: string) => void;
    total: number;
    children: React.ReactNode;
  }) => (
    <section>
      <input
        aria-label="search users"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <span data-testid="total">{total}</span>
      {children}
    </section>
  ),
}));

vi.mock("@features/users/ui/UsersTable", () => ({
  default: ({
    items,
    onEdit,
    onDelete,
    isLoading,
    isError,
    onError,
  }: {
    items: Array<{ id: string; name: string }>;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    isLoading: boolean;
    isError: boolean;
    onError: () => void;
  }) => (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="error">{String(isError)}</span>
      <button onClick={onError}>retry</button>
      <ul>
        {items.map((user) => (
          <li key={user.id}>
            <span>{user.name}</span>
            <button onClick={() => onEdit(user.id)}>edit {user.id}</button>
            <button onClick={() => onDelete(user.id)}>delete {user.id}</button>
          </li>
        ))}
      </ul>
    </div>
  ),
}));

// El diálogo expone el submit y los props de estado para poder afirmarlos.
vi.mock("@features/users/ui/CreateUserDialog", () => ({
  default: ({
    open,
    onOpenChange,
    onSubmit,
    loading,
    error,
    defaultValues,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: Record<string, string>) => void;
    loading?: boolean;
    error?: string | null;
    defaultValues?: Record<string, string>;
  }) =>
    open ? (
      <div role="dialog" aria-label="user form">
        <span data-testid="dialog-loading">{String(loading)}</span>
        <span data-testid="dialog-error">{error ?? "none"}</span>
        <span data-testid="dialog-defaults">
          {JSON.stringify(defaultValues ?? null)}
        </span>
        <button
          onClick={() =>
            onSubmit({
              name: "Nuevo",
              email: "nuevo@example.com",
              role: "qc",
            })
          }
        >
          submit
        </button>
        <button
          onClick={() =>
            onSubmit({
              name: "Nuevo",
              email: "nuevo@example.com",
              role: "qc",
              password: "S3cret!",
            })
          }
        >
          submit with password
        </button>
        <button onClick={() => onOpenChange(false)}>close form</button>
      </div>
    ) : null,
}));

vi.mock("@shared/ui/confirm-dialog", () => ({
  default: ({
    open,
    onOpenChange,
    onConfirm,
    loading,
    error,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    loading?: boolean;
    error?: string | null;
  }) =>
    open ? (
      <div role="dialog" aria-label="confirm delete">
        <span data-testid="confirm-loading">{String(loading)}</span>
        <span data-testid="confirm-error">{error ?? "none"}</span>
        <button onClick={onConfirm}>confirm delete</button>
        <button onClick={() => onOpenChange(false)}>cancel delete</button>
      </div>
    ) : null,
}));

/** Usuario del listado. */
function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "u-1",
    cognitoId: "sub-1",
    name: "Jane",
    email: "jane@example.com",
    role: "auditor",
    ...overrides,
  };
}

function stubUsers(overrides: Record<string, unknown> = {}) {
  const refetch = vi.fn().mockResolvedValue(undefined);
  useUsersQuery.mockReturnValue({
    data: { items: [makeUser()] },
    isLoading: false,
    isError: false,
    refetch,
    ...overrides,
  });
  return refetch;
}

async function renderPage() {
  const { default: UsersPage } = await import("../page");
  return render(<UsersPage />);
}

describe("UsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubUsers();
  });

  it("renders the header, the metrics and the table", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { name: "User Management" })).toBeTruthy();
    expect(screen.getByText("Jane")).toBeTruthy();
    expect(screen.getByTestId("total").textContent).toBe("1");
  });

  it("counts the users of each role", async () => {
    stubUsers({
      data: {
        items: [
          makeUser(),
          makeUser({ id: "u-2", role: "qc" }),
          makeUser({ id: "u-3", role: "admin" }),
          makeUser({ id: "u-4", role: "auditor" }),
        ],
      },
    });

    await renderPage();

    // El rol de QC es el grupo "qc" de Cognito, no "qc_manager".
    expect(JSON.parse(screen.getByTestId("metrics").textContent ?? "{}")).toEqual({
      totalUsers: 4,
      auditors: 2,
      qcManagers: 1,
      projectManagers: 1,
    });
  });

  it("reports zero for every role when there are no users", async () => {
    stubUsers({ data: { items: [] } });

    await renderPage();

    expect(JSON.parse(screen.getByTestId("metrics").textContent ?? "{}")).toEqual({
      totalUsers: 0,
      auditors: 0,
      qcManagers: 0,
      projectManagers: 0,
    });
  });

  it("renders an empty list when the response has no items", async () => {
    stubUsers({ data: undefined });

    await renderPage();

    expect(screen.getByTestId("total").textContent).toBe("0");
  });

  it.each([
    ["the name", "jane", 1],
    ["the email", "example.com", 1],
    ["nothing that matches", "zzz", 0],
  ])("filters by %s", async (_label, term, expected) => {
    await renderPage();

    await userEvent.type(screen.getByLabelText("search users"), term);

    await waitFor(() =>
      expect(screen.queryAllByText("Jane")).toHaveLength(expected)
    );
  });

  it("ignores surrounding whitespace in the search", async () => {
    await renderPage();

    await userEvent.type(screen.getByLabelText("search users"), "  jane  ");

    expect(screen.getByText("Jane")).toBeTruthy();
  });

  it("propagates the loading and error state to the table", async () => {
    stubUsers({ isLoading: true, isError: true });

    await renderPage();

    expect(screen.getByTestId("loading").textContent).toBe("true");
    expect(screen.getByTestId("error").textContent).toBe("true");
  });

  it("refetches from the error action", async () => {
    const refetch = stubUsers();

    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "retry" }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("opens the form with no defaults from the header action", async () => {
    await renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Add User" }));

    expect(screen.getByRole("dialog", { name: "user form" })).toBeTruthy();
    expect(screen.getByTestId("dialog-defaults").textContent).toBe("null");
  });

  it("opens the form prefilled when editing", async () => {
    await renderPage();

    await userEvent.click(screen.getByRole("button", { name: "edit u-1" }));

    expect(
      JSON.parse(screen.getByTestId("dialog-defaults").textContent ?? "null")
    ).toEqual({
      name: "Jane",
      email: "jane@example.com",
      role: "auditor",
    });
  });

  it("ignores an edit for an id that is not in the list", async () => {
    await renderPage();

    // El listado sólo trae u-1, así que el diálogo no se abre.
    expect(screen.queryByRole("dialog", { name: "user form" })).toBeNull();
  });

  it("creates a user and refetches the list", async () => {
    const refetch = stubUsers();
    createUser.mockResolvedValue(undefined);

    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Add User" }));
    await userEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() =>
      expect(createUser).toHaveBeenCalledWith({
        name: "Nuevo",
        email: "nuevo@example.com",
        role: "qc",
      })
    );
    expect(refetch).toHaveBeenCalled();
    expect(await screen.findByText("User Created")).toBeTruthy();
  });

  it("updates a user without sending an empty password", async () => {
    updateUser.mockResolvedValue(undefined);

    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "edit u-1" }));
    await userEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith("u-1", {
        name: "Nuevo",
        email: "nuevo@example.com",
        role: "qc",
      })
    );
    expect(await screen.findByText("User Updated")).toBeTruthy();
  });

  it("includes the password when the form provides one", async () => {
    updateUser.mockResolvedValue(undefined);

    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "edit u-1" }));
    await userEvent.click(
      screen.getByRole("button", { name: "submit with password" })
    );

    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith("u-1", {
        name: "Nuevo",
        email: "nuevo@example.com",
        role: "qc",
        password: "S3cret!",
      })
    );
  });

  it("shows the error of a failed save and keeps the form open", async () => {
    createUser.mockRejectedValue(new Error("email already exists"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Add User" }));
    await userEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() =>
      expect(screen.getByTestId("dialog-error").textContent).toBe(
        "email already exists"
      )
    );
    expect(consoleError).toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "user form" })).toBeTruthy();
  });

  it("falls back to a generic message when the error has none", async () => {
    createUser.mockRejectedValue({});
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Add User" }));
    await userEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() =>
      expect(screen.getByTestId("dialog-error").textContent).toContain(
        "Failed to save user"
      )
    );
  });

  it("closes the success modal and forgets the user being edited", async () => {
    updateUser.mockResolvedValue(undefined);

    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "edit u-1" }));
    await userEvent.click(screen.getByRole("button", { name: "submit" }));
    await userEvent.click(await screen.findByRole("button", { name: "Close" }));

    await waitFor(() => expect(screen.queryByText("User Updated")).toBeNull());

    // Tras cerrar, el formulario vuelve a abrirse sin valores por defecto.
    await userEvent.click(screen.getByRole("button", { name: "Add User" }));
    expect(screen.getByTestId("dialog-defaults").textContent).toBe("null");
  });

  it("forgets the user being edited when the form is dismissed", async () => {
    await renderPage();

    await userEvent.click(screen.getByRole("button", { name: "edit u-1" }));
    await userEvent.click(screen.getByRole("button", { name: "close form" }));
    await userEvent.click(screen.getByRole("button", { name: "Add User" }));

    expect(screen.getByTestId("dialog-defaults").textContent).toBe("null");
  });

  it("deletes a user after confirming and refetches", async () => {
    const refetch = stubUsers();
    deleteUser.mockResolvedValue(undefined);

    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "delete u-1" }));
    expect(screen.getByRole("dialog", { name: "confirm delete" })).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "confirm delete" }));

    await waitFor(() => expect(deleteUser).toHaveBeenCalledWith("u-1"));
    expect(refetch).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "confirm delete" })).toBeNull()
    );
  });

  it("cancels the deletion without calling the repository", async () => {
    await renderPage();

    await userEvent.click(screen.getByRole("button", { name: "delete u-1" }));
    await userEvent.click(screen.getByRole("button", { name: "cancel delete" }));

    expect(deleteUser).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: "confirm delete" })
    ).toBeNull();
  });

  it("keeps the confirmation open when the deletion fails", async () => {
    deleteUser.mockRejectedValue(new Error("conflict"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "delete u-1" }));
    await userEvent.click(screen.getByRole("button", { name: "confirm delete" }));

    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    // El diálogo queda abierto CON el mensaje del error: antes sólo se apagaba
    // el spinner y el usuario no se enteraba de que el borrado había fallado.
    expect(screen.getByRole("dialog", { name: "confirm delete" })).toBeTruthy();
    expect(screen.getByTestId("confirm-loading").textContent).toBe("false");
    await waitFor(() =>
      expect(screen.getByTestId("confirm-error").textContent).toBe("conflict")
    );
  });
});
