/**
 * Edición de un flow: carga por id, estados de carga y de error.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useFlowById = vi.fn();
const useParams = vi.fn();

vi.mock("@features/flows/lib/useFlowsQuery", () => ({
  useFlowById: (...args: unknown[]) => useFlowById(...args),
}));
vi.mock("next/navigation", () => ({
  useParams: () => useParams(),
}));
vi.mock("@shared/ui/page-header", () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock("@shared/ui/Loading", () => ({
  Loading: ({ text }: { text: string }) => <div role="status">{text}</div>,
}));
vi.mock("@shared/ui/Retry", () => ({
  Retry: ({ text, onClick }: { text: string; onClick: () => void }) => (
    <button onClick={onClick}>{text}</button>
  ),
}));
vi.mock("@features/flows/ui/FlowEditor", () => ({
  FlowEditor: ({ initialFlow }: { initialFlow: { id: string } }) => (
    <div data-testid="editor">{initialFlow.id}</div>
  ),
}));

async function renderPage() {
  const { default: FlowEditorPage } = await import("../page");
  return render(<FlowEditorPage />);
}

describe("FlowEditorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useParams.mockReturnValue({ id: "flow-1" });
  });

  it("loads the flow of the route and renders the editor", async () => {
    useFlowById.mockReturnValue({
      flow: { id: "flow-1", title: "Curb ramps" },
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    await renderPage();

    expect(useFlowById).toHaveBeenCalledWith("flow-1", true);
    expect(
      screen.getByRole("heading", { name: "Edit Flow: Curb ramps" })
    ).toBeTruthy();
    expect(screen.getByTestId("editor").textContent).toBe("flow-1");
  });

  it("shows the loading state instead of the editor", async () => {
    useFlowById.mockReturnValue({
      flow: undefined,
      isLoading: true,
      error: undefined,
      refetch: vi.fn(),
    });

    await renderPage();

    expect(screen.getByRole("status").textContent).toBe("Loading Flow");
    expect(screen.queryByTestId("editor")).toBeNull();
  });

  it.each([
    ["the query fails", new Error("dynamo down"), "Error loading flow: dynamo down"],
    ["the flow does not exist", undefined, "Error loading flow: Flow not found"],
  ])("shows a retry when %s", async (_label, error, expected) => {
    const refetch = vi.fn();
    useFlowById.mockReturnValue({
      flow: undefined,
      isLoading: false,
      error,
      refetch,
    });

    await renderPage();

    await userEvent.click(screen.getByRole("button", { name: expected }));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("editor")).toBeNull();
  });

  it("survives a route without params", async () => {
    useParams.mockReturnValue(null);
    useFlowById.mockReturnValue({
      flow: undefined,
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    await renderPage();

    expect(useFlowById).toHaveBeenCalledWith(undefined, true);
  });
});
