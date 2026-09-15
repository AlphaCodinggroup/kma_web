import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import type { Flow } from "@entities/flow/model";

// ---- mocks ----

const useSessionMock = vi.fn();
vi.mock("@processes/auth/hooks", () => ({
  useSession: () => useSessionMock(),
}));

vi.mock("@features/flows/api/flows.repo.impl", () => ({
  flowsRepo: { delete: vi.fn() },
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// useFlowById es la frontera de datos: se controla desde el test.
const useFlowByIdMock = vi.fn();
vi.mock("@features/flows/lib/useFlowsQuery", () => ({
  useFlowById: (...args: unknown[]) => useFlowByIdMock(...args),
  flowsKeys: {
    all: ["flows"],
    list: () => ["flows", "list"],
    detail: (id: string) => ["flows", "detail", id],
  },
}));

// ---- import after mocks ----
import FlowCardWithDialog from "../FlowCardWithDialog";

const loadedFlow: Flow = {
  id: "AR",
  title: "Ramps (from API)",
  description: "Loaded description",
  version: 1,
  steps: [
    { id: "AR-Q01", type: "Question", text: "Is the ramp compliant?" },
    {
      id: "AR-S01",
      type: "Select",
      title: "Surface",
      options: [{ label: "Concrete", next: "AR-Q01" }],
    },
    { id: "AR-F01", type: "Form", title: "Measurements", fields: [] },
  ],
};

function stubQuery(
  overrides: Partial<{
    flow: Flow | null | undefined;
    isLoading: boolean;
    error: { status?: number } | null;
  }> = {}
) {
  useFlowByIdMock.mockReturnValue({
    flow: undefined,
    isLoading: false,
    error: null,
    ...overrides,
  });
}

describe("FlowCardWithDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionMock.mockReturnValue({ isAdmin: true });
    stubQuery();
  });

  it("renders the card with the dialog closed and does not fetch until opened", () => {
    render(
      <FlowCardWithDialog flowId="AR" title="Ramps" description="Local desc" />
    );

    expect(screen.getByRole("heading", { name: "Ramps" })).toBeInTheDocument();
    expect(
      screen.queryByTestId("flow-questions-dialog")
    ).not.toBeInTheDocument();
    expect(useFlowByIdMock).toHaveBeenCalledWith("AR", false);
  });

  it("opens the dialog when View Questions is pressed", async () => {
    const user = userEvent.setup();
    render(<FlowCardWithDialog flowId="AR" title="Ramps" />);

    await user.click(screen.getByRole("button", { name: /view questions/i }));

    expect(screen.getByTestId("flow-questions-dialog")).toBeInTheDocument();
    expect(useFlowByIdMock).toHaveBeenLastCalledWith("AR", true);
  });

  it("shows the loading placeholder while the flow is being fetched", async () => {
    stubQuery({ isLoading: true });
    const user = userEvent.setup();
    render(<FlowCardWithDialog flowId="AR" title="Ramps" />);

    await user.click(screen.getByRole("button", { name: /view questions/i }));

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.getByText("Questions (0)")).toBeInTheDocument();
  });

  it("shows Unauthorized for a 401 error", async () => {
    stubQuery({ error: { status: 401 } });
    const user = userEvent.setup();
    render(<FlowCardWithDialog flowId="AR" title="Ramps" />);

    await user.click(screen.getByRole("button", { name: /view questions/i }));

    expect(screen.getByText("Unauthorized")).toBeInTheDocument();
  });

  it("shows a generic failure message for other errors", async () => {
    stubQuery({ error: { status: 500 } });
    const user = userEvent.setup();
    render(<FlowCardWithDialog flowId="AR" title="Ramps" />);

    await user.click(screen.getByRole("button", { name: /view questions/i }));

    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });

  it("falls back to the card description when there is no flow, no error and no loading", async () => {
    const user = userEvent.setup();
    render(
      <FlowCardWithDialog flowId="AR" title="Ramps" description="Local desc" />
    );

    await user.click(screen.getByRole("button", { name: /view questions/i }));

    expect(
      screen.getAllByText("Local desc").length
    ).toBeGreaterThanOrEqual(1);
  });

  it("falls back to an empty description when the card has none", async () => {
    const user = userEvent.setup();
    render(<FlowCardWithDialog flowId="AR" title="Ramps" />);

    await user.click(screen.getByRole("button", { name: /view questions/i }));

    expect(screen.getByTestId("flow-questions-dialog")).toBeInTheDocument();
  });

  it("maps the loaded flow into the dialog view model", async () => {
    stubQuery({ flow: loadedFlow });
    const user = userEvent.setup();
    render(<FlowCardWithDialog flowId="AR" title="Ramps" />);

    await user.click(screen.getByRole("button", { name: /view questions/i }));

    expect(
      screen.getByRole("heading", { name: "Ramps (from API)" })
    ).toBeInTheDocument();
    // Sin includeForms sólo entran Question y Select.
    expect(screen.getByText("Questions (2)")).toBeInTheDocument();
    expect(screen.queryByText("Measurements")).not.toBeInTheDocument();
  });

  it("forwards mapOptions so Forms can be included", async () => {
    stubQuery({ flow: loadedFlow });
    const user = userEvent.setup();
    render(
      <FlowCardWithDialog
        flowId="AR"
        title="Ramps"
        mapOptions={{ includeForms: true }}
      />
    );

    await user.click(screen.getByRole("button", { name: /view questions/i }));

    expect(screen.getByText("Questions (3)")).toBeInTheDocument();
    expect(screen.getByText("Measurements")).toBeInTheDocument();
  });

  it("closes the dialog again through the close button", async () => {
    stubQuery({ flow: loadedFlow });
    const user = userEvent.setup();
    render(<FlowCardWithDialog flowId="AR" title="Ramps" />);

    await user.click(screen.getByRole("button", { name: /view questions/i }));
    await user.click(
      screen.getByRole("button", { name: "Close questions modal" })
    );

    expect(
      screen.queryByTestId("flow-questions-dialog")
    ).not.toBeInTheDocument();
  });

  it("uses the provided dialogTestId", async () => {
    const user = userEvent.setup();
    render(
      <FlowCardWithDialog flowId="AR" title="Ramps" dialogTestId="dlg-AR" />
    );

    await user.click(screen.getByRole("button", { name: /view questions/i }));

    expect(screen.getByTestId("dlg-AR")).toBeInTheDocument();
  });
});
