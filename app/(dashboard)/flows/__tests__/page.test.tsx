/**
 * Listado de flows: búsqueda, estados de carga y de error.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useFlowsQuery = vi.fn();
const sessionMock = vi.fn();
vi.mock("@processes/auth/hooks", () => ({ useSession: () => sessionMock() }));

vi.mock("@features/flows/lib/useFlowsQuery", () => ({
  useFlowsQuery: (...args: unknown[]) => useFlowsQuery(...args),
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
    items: Array<{ id: string; title: string; description?: string }>;
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
        { id: "flow-1", title: "Curb ramps", description: "Rampas de cordón" },
        { id: "flow-2", title: "Doors", description: null },
      ],
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
});
