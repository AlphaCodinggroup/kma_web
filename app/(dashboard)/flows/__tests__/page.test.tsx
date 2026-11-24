/**
 * Listado de flows y gestión de categorías: búsqueda, pestañas, alta/edición y estados de carga/error.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useFlowsQuery = vi.fn();
const useFlowCategoriesQuery = vi.fn();
const createCategoryMutateAsync = vi.fn();
const updateCategoryMutateAsync = vi.fn();
const deleteCategoryMutateAsync = vi.fn();
const sessionMock = vi.fn();

vi.mock("@processes/auth/hooks", () => ({ useSession: () => sessionMock() }));

vi.mock("@features/flows/lib/useFlowsQuery", () => ({
  useFlowsQuery: (...args: unknown[]) => useFlowsQuery(...args),
}));

vi.mock("@features/flows/lib/useFlowCategoriesQuery", () => ({
  useFlowCategoriesQuery: (...args: unknown[]) => useFlowCategoriesQuery(...args),
  useCreateFlowCategory: () => ({
    mutateAsync: createCategoryMutateAsync,
    isPending: false,
  }),
  useUpdateFlowCategory: () => ({
    mutateAsync: updateCategoryMutateAsync,
    isPending: false,
  }),
  useDeleteFlowCategory: () => ({
    mutateAsync: deleteCategoryMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@shared/ui/page-header", () => ({
  default: ({ title, subtitle, actionSlot }: { title: string; subtitle?: string; actionSlot?: React.ReactNode }) => (
    <header>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {actionSlot}
    </header>
  ),
}));

vi.mock("@shared/ui/search-input", () => ({
  default: ({
    placeholder,
    value,
    onChange,
  }: {
    placeholder: string;
    value: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <input aria-label={placeholder} value={value} onChange={onChange} />
  ),
}));

vi.mock("@shared/ui/Loading", () => ({
  Loading: ({ text }: { text: string }) => <div role="status">{text}</div>,
}));

vi.mock("@features/flows/ui/FlowSection", () => ({
  FlowsSection: ({
    items,
  }: {
    items: Array<{ id: string; title: string; description?: string; categoryName?: string }>;
  }) => (
    <ul data-testid="flows">
      {items.map((item) => (
        <li key={item.id}>{`${item.title}|${item.description}`}</li>
      ))}
    </ul>
  ),
}));

function stubFlows(overrides: Record<string, unknown> = {}) {
  useFlowsQuery.mockReturnValue({
    data: {
      flows: [
        { id: "flow-1", title: "Curb ramps", description: "Rampas de cordón", category: "cat-1" },
        { id: "flow-2", title: "Doors", description: null },
      ],
    },
    isLoading: false,
    error: undefined,
    refetch: vi.fn(),
    ...overrides,
  });
}

function stubCategories(overrides: Record<string, unknown> = {}) {
  useFlowCategoriesQuery.mockReturnValue({
    data: {
      categories: [
        { id: "cat-1", name: "Exterior", description: "Exterior routes", isActive: true },
        { id: "cat-2", name: "Legacy", description: "Old category", isActive: false },
      ],
      total: 2,
    },
    isLoading: false,
    error: undefined,
    refetch: vi.fn(),
    ...overrides,
  });
}

async function renderPage() {
  const { default: FlowsPage } = await import("../page");
  return render(<FlowsPage />);
}

describe("FlowsPage", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    vi.clearAllMocks();
    sessionMock.mockReturnValue({ isAdmin: true });
    stubCategories();
  });

  it("allows administrators to create a flow", async () => {
    stubFlows();
    await renderPage();
    expect(screen.getByRole("link", { name: "Create Flow" })).toHaveAttribute("href", "/flows/new");
  });

  it("keeps the creation action hidden for reviewers", async () => {
    sessionMock.mockReturnValue({ isAdmin: false });
    stubFlows();
    await renderPage();
    expect(screen.queryByRole("link", { name: "Create Flow" })).not.toBeInTheDocument();
  });

  it("asks the query for the active flows only", async () => {
    stubFlows();

    await renderPage();

    expect(useFlowsQuery).toHaveBeenCalledWith(true);
    expect(useFlowCategoriesQuery).toHaveBeenCalledWith(true);
  });

  it("renders every flow, with an empty description when it is null", async () => {
    stubFlows();

    await renderPage();

    expect(screen.getByText("Curb ramps|Rampas de cordón")).toBeTruthy();
    expect(screen.getByText("Doors|")).toBeTruthy();
  });

  it("shows the loading state instead of the list", async () => {
    stubFlows({ isLoading: true, data: undefined });

    await renderPage();

    expect(screen.getByRole("status").textContent).toBe("Loading flows…");
    expect(screen.queryByTestId("flows")).toBeNull();
  });

  it("shows the error message from the query", async () => {
    stubFlows({ error: new Error("dynamo down"), data: undefined });

    await renderPage();

    expect(screen.getByText(/Error loading flows: dynamo down/)).toBeTruthy();
  });

  it("keeps the catalog visible after a refresh fails and offers a retry", async () => {
    const refetch = vi.fn();
    stubFlows({ error: new Error("connection lost"), refetch });
    await renderPage();
    expect(screen.getByText("Curb ramps|Rampas de cordón")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("connection lost");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("clears a search with no matches and restores the catalog", async () => {
    stubFlows();
    await renderPage();
    await userEvent.type(screen.getByLabelText("Search flows..."), "missing");
    expect(screen.getByText("No flows match your search")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByText("Curb ramps|Rampas de cordón")).toBeInTheDocument();
    expect(new URL(window.location.href).searchParams.has("q")).toBe(false);
  });

  it("renders an empty list when the response has no flows", async () => {
    stubFlows({ data: {} });

    await renderPage();

    expect(screen.getByTestId("flows").children).toHaveLength(0);
  });

  it.each([
    ["the title", "curb", ["Curb ramps|Rampas de cordón"]],
    ["the description", "cordón", ["Curb ramps|Rampas de cordón"]],
    ["nothing that matches", "zzz", []],
  ])("filters by %s", async (_label, term, expected) => {
    stubFlows();

    await renderPage();
    await userEvent.type(screen.getByLabelText("Search flows..."), term);

    const rendered = Array.from(screen.getByTestId("flows").children).map(
      (node) => node.textContent
    );
    expect(rendered).toEqual(expected);
  });

  it("ignores surrounding whitespace in the search", async () => {
    stubFlows();

    await renderPage();
    await userEvent.type(screen.getByLabelText("Search flows..."), "  doors  ");

    expect(screen.getByTestId("flows").children).toHaveLength(1);
  });

  it("switches to the Categories tab, filters categories, and creates/edits a category", async () => {
    const user = userEvent.setup();
    stubFlows();
    createCategoryMutateAsync.mockResolvedValueOnce({
      id: "cat-3",
      name: "Parking",
      description: "Parking lots",
      isActive: true,
    });
    updateCategoryMutateAsync.mockResolvedValueOnce({
      id: "cat-1",
      name: "Exterior Updated",
      description: "Exterior routes",
      isActive: true,
    });

    await renderPage();

    await user.click(screen.getByRole("tab", { name: /Categories/i }));
    expect(screen.getByText("Exterior")).toBeInTheDocument();
    expect(screen.getByText("Legacy")).toBeInTheDocument();

    // Filtrar por estado activo
    await user.selectOptions(screen.getByLabelText("Filter categories by status"), "active");
    expect(screen.getByText("Exterior")).toBeInTheDocument();
    expect(screen.queryByText("Legacy")).not.toBeInTheDocument();

    // Crear nueva categoría desde el botón de cabecera
    await user.click(screen.getByRole("button", { name: "Create Category" }));
    await user.type(screen.getByLabelText("Name"), "Parking");
    await user.type(screen.getByLabelText("Description"), "Parking lots");
    await user.click(screen.getByRole("button", { name: "Create category" }));

    expect(createCategoryMutateAsync).toHaveBeenCalledWith({
      name: "Parking",
      description: "Parking lots",
      isActive: true,
    });

    // Editar categoría existente
    await user.click(screen.getByRole("button", { name: "Edit category Exterior" }));
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Exterior Updated");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateCategoryMutateAsync).toHaveBeenCalledWith({
      id: "cat-1",
      input: {
        name: "Exterior Updated",
        description: "Exterior routes",
        isActive: true,
      },
    });
  });

  it("shows categories loading and error states with retry", async () => {
    const user = userEvent.setup();
    const refetchCategories = vi.fn();
    stubFlows();
    stubCategories({
      data: undefined,
      isLoading: false,
      error: new Error("categories offline"),
      refetch: refetchCategories,
    });

    window.history.replaceState(null, "", "/?tab=categories");
    await renderPage();

    expect(screen.getByText(/Error loading categories: categories offline/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetchCategories).toHaveBeenCalledTimes(1);
  });
});
