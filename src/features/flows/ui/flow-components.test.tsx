import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isAdmin: true,
  remove: vi.fn(),
  flowResult: {} as any,
  useFlowById: vi.fn(),
  mapFlow: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("@processes/auth/hooks", () => ({ useSession: () => ({ isAdmin: mocks.isAdmin }) }));
vi.mock("@features/flows/api/flows.repo.impl", () => ({ flowsRepo: { delete: mocks.remove } }));
vi.mock("@features/flows/lib/useFlowsQuery", () => ({
  useFlowById: (id: string, enabled: boolean) => {
    mocks.useFlowById(id, enabled);
    return mocks.flowResult;
  },
}));
vi.mock("./adapters/mapFlowToDialogVM", () => ({ mapFlowToDialogVM: (...args: any[]) => mocks.mapFlow(...args) }));

import FlowCard from "./FlowCard";
import FlowCardWithDialog from "./FlowCardWithDialog";
import FlowQuestionsDialog from "./FlowQuestionsDialog";
import FlowsSection from "./FlowSection";

describe("FlowCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAdmin = true;
    mocks.remove.mockResolvedValue(undefined);
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal("alert", vi.fn());
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows content and delegates question viewing", async () => {
    const user = userEvent.setup();
    const onViewQuestions = vi.fn();
    render(<FlowCard flowId="flow-1" title="Safety" description="Checks" onViewQuestions={onViewQuestions} />);
    expect(screen.getByText("Safety")).toBeInTheDocument();
    expect(screen.getByText("Checks")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "View Questions" }));
    expect(onViewQuestions).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("link", { name: "Edit flow" }));
    expect(screen.getByText("Navigating to flow...")).toBeInTheDocument();
  });

  it("disables destructive and edit actions for non-admin users", () => {
    mocks.isAdmin = false;
    render(<FlowCard flowId="flow-1" title="Safety" onViewQuestions={vi.fn()} />);
    expect(screen.getByTitle("Only administrators can delete flows")).toBeDisabled();
    expect(screen.queryByRole("link", { name: "Edit flow" })).not.toBeInTheDocument();
    expect(screen.getByTitle("Only administrators can edit flows")).toBeInTheDocument();
  });

  it("honors deletion cancellation and completes deletion callbacks", async () => {
    const user = userEvent.setup();
    const onDeleted = vi.fn();
    const confirm = vi.mocked(globalThis.confirm);
    confirm.mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<FlowCard flowId="flow-1" title="Safety" onViewQuestions={vi.fn()} onDeleted={onDeleted} />);
    const deleteButton = screen.getByTitle("Delete flow");
    await user.click(deleteButton);
    expect(mocks.remove).not.toHaveBeenCalled();
    await user.click(deleteButton);
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith("flow-1"));
    expect(onDeleted).toHaveBeenCalledOnce();
    expect(deleteButton).toBeEnabled();
  });

  it("shows a visible alert when deletion fails", async () => {
    const user = userEvent.setup();
    mocks.remove.mockRejectedValue(new Error("network"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<FlowCard flowId="flow-1" title="Safety" onViewQuestions={vi.fn()} />);
    await user.click(screen.getByTitle("Delete flow"));
    await waitFor(() => expect(globalThis.alert).toHaveBeenCalledWith("Failed to delete flow"));
    expect(console.error).toHaveBeenCalledWith("Failed to delete flow", expect.any(Error));
  });
});

describe("FlowQuestionsDialog", () => {
  afterEach(cleanup);

  const flow = {
    title: "Inspection flow",
    description: "All questions",
    questions: [
      { id: "q1", text: "Safe?", type: "yes_no" as const },
      { id: "q2", text: "Choose", type: "multiple_choice" as const, options: ["One", "Two"], visibleIf: { questionId: "q1", equals: true } },
      { id: "q3", text: "Empty choices", type: "multiple_choice" as const, options: [] },
      { id: "q4", text: "Explain", type: "text_input" as const },
    ],
  };

  it("renders no dialog while closed", () => {
    render(<FlowQuestionsDialog open={false} onOpenChange={vi.fn()} flow={flow} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders all question types, options and conditions and closes", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<FlowQuestionsDialog open onOpenChange={onOpenChange} flow={flow} data-testid="questions" />);
    const dialog = screen.getByRole("dialog", { name: "Inspection flow" });
    expect(within(dialog).getByText("Questions (4)")).toBeInTheDocument();
    expect(within(dialog).getByText("Yes/No")).toBeInTheDocument();
    expect(within(dialog).getAllByText("Multiple Choice")).toHaveLength(2);
    expect(within(dialog).getByText("Text Input")).toBeInTheDocument();
    expect(within(dialog).getByText("One")).toBeInTheDocument();
    expect(within(dialog).getByText(/Shows when Q1/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Close questions modal" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("supports a flow without description and unknown legacy question types", () => {
    render(<FlowQuestionsDialog open onOpenChange={vi.fn()} flow={{ title: "Legacy", questions: [{ id: "q", text: "Legacy question", type: "legacy" as any }] }} />);
    expect(screen.getByText("legacy")).toBeInTheDocument();
    expect(screen.queryByText("All questions")).not.toBeInTheDocument();
  });
});

describe("FlowCardWithDialog and FlowsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAdmin = true;
    mocks.flowResult = { flow: undefined, isLoading: false, error: null };
    mocks.mapFlow.mockReturnValue({ title: "Mapped", description: "Mapped detail", questions: [] });
  });
  afterEach(cleanup);

  it("loads flow details only after opening and maps backend data", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<FlowCardWithDialog flowId="flow-1" title="Card" description="Fallback" mapOptions={{ includeForms: true }} />);
    expect(mocks.useFlowById).toHaveBeenLastCalledWith("flow-1", false);
    await user.click(screen.getByRole("button", { name: "View Questions" }));
    expect(mocks.useFlowById).toHaveBeenLastCalledWith("flow-1", true);
    expect(screen.getAllByText("Fallback")).toHaveLength(2);

    const backendFlow = { id: "flow-1", name: "Backend" };
    mocks.flowResult = { flow: backendFlow, isLoading: false, error: null };
    rerender(<FlowCardWithDialog flowId="flow-1" title="Card" description="Fallback" mapOptions={{ includeForms: true }} />);
    expect(mocks.mapFlow).toHaveBeenCalledWith(backendFlow, { includeForms: true });
    expect(screen.getByRole("dialog", { name: "Mapped" })).toBeInTheDocument();
  });

  it.each([
    [{ isLoading: true, error: null }, "Loading…"],
    [{ isLoading: false, error: { status: 401 } }, "Unauthorized"],
    [{ isLoading: false, error: { status: 500 } }, "Failed to load"],
  ] as const)("shows placeholder states %#", async (state, message) => {
    const user = userEvent.setup();
    mocks.flowResult = { flow: undefined, ...state };
    render(<FlowCardWithDialog flowId="flow-1" title="Card" />);
    await user.click(screen.getByRole("button", { name: "View Questions" }));
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("renders a section with default and explicit flow ids", () => {
    render(<FlowsSection items={[{ id: "one", title: "One" }, { id: "two", flowId: "backend-two", title: "Two", description: "Second" }]} />);
    expect(screen.getByTestId("flows-section")).toBeInTheDocument();
    expect(mocks.useFlowById).toHaveBeenCalledWith("one", false);
    expect(mocks.useFlowById).toHaveBeenCalledWith("backend-two", false);
  });
});
