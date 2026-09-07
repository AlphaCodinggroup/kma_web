// ---------------------------------------------------------------------------
// FlowEditor: render inicial, sidebar, búsqueda, permisos y modales informativos.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---- mocks ----

const { pushMock, repoMock, sessionMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  repoMock: {
    create: vi.fn(),
    update: vi.fn(),
    getPresignedUrl: vi.fn(),
    uploadFile: vi.fn(),
  },
  sessionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@processes/auth/hooks", () => ({
  useSession: () => sessionMock(),
}));

vi.mock("@features/flows/api/flows.repo.impl", () => ({
  flowsRepo: repoMock,
  FlowsApiError: class FlowsApiError extends Error {},
}));

vi.mock("@shared/config/env", () => ({
  PublicEnv: { queryStaleTimeMs: 30_000 },
}));

// ---- import after mocks ----

import {
  comboboxIn,
  fieldRow,
  makeEndStep,
  makeFormStep,
  makeNewFlow,
  makeQuestionStep,
  makeSelectStep,
  makeValidFlow,
  renderEditor,
  sidebar,
  sidebarCard,
  sidebarOrder,
  textboxIn,
} from "./flowEditorHarness";

describe("FlowEditor - initial render", () => {
  let confirmSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock.mockReturnValue({ isAdmin: true });
    localStorage.clear();
    confirmSpy = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmSpy);
    vi.stubGlobal("alert", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders an empty create flow with no selected step", () => {
    renderEditor(makeNewFlow(), "create");

    expect(screen.getByPlaceholderText("Untitled Flow")).toHaveValue("");
    expect(
      screen.getByPlaceholderText("Add a description (optional)...")
    ).toHaveValue("");
    expect(
      screen.getByText("Select a step from the sidebar to edit")
    ).toBeInTheDocument();
    expect(sidebarOrder()).toEqual([]);
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
  });

  it("offers one add button per step type in the sidebar", () => {
    renderEditor(makeNewFlow(), "create");

    for (const type of ["Question", "Form", "Select", "End"]) {
      expect(screen.getByTitle(`Add ${type} step`)).toBeEnabled();
    }
  });

  it("renders an existing flow with its steps and selects the first one", () => {
    renderEditor(makeValidFlow(), "edit");

    expect(screen.getByPlaceholderText("Untitled Flow")).toHaveValue("Ramps");
    expect(
      screen.getByPlaceholderText("Add a description (optional)...")
    ).toHaveValue("Ramp audit flow");
    expect(sidebarOrder()).toEqual(["AR-S01", "AR-Q01", "AR-F01", "AR-E01"]);

    // El primer paso queda seleccionado y su detalle se muestra.
    expect(screen.getByRole("heading", { name: "AR-S01" })).toBeInTheDocument();
    expect(textboxIn("Step ID")).toHaveValue("AR-S01");
    expect(screen.getByText("Editing step details")).toBeInTheDocument();
  });

  it("shows the step summary text for every step type in the sidebar", () => {
    renderEditor(makeValidFlow(), "edit");
    const list = within(sidebar());

    expect(list.getByText("Choose the barrier")).toBeInTheDocument();
    expect(list.getByText("Is the ramp compliant?")).toBeInTheDocument();
    expect(list.getByText("Record quantity")).toBeInTheDocument();
    expect(list.getByText("End of flow")).toBeInTheDocument();
  });

  it("falls back to the Select text when the Select has no title", () => {
    const flow = makeValidFlow();
    flow.steps = [
      makeSelectStep({ title: "", text: "Only text here" }),
      makeQuestionStep(),
      makeFormStep(),
      makeEndStep(),
    ];
    renderEditor(flow, "edit");

    expect(within(sidebar()).getByText("Only text here")).toBeInTheDocument();
  });

  it("marks steps with missing references as incomplete", () => {
    const flow = makeValidFlow();
    flow.steps = [
      makeQuestionStep({ id: "AR-Q01", yesNext: "", noNext: "" }),
      makeFormStep({ id: "AR-F01", next: "" }),
      makeSelectStep({
        id: "AR-S01",
        options: [{ label: "Door", next: "" }],
      }),
      makeEndStep(),
    ];
    renderEditor(flow, "edit");

    expect(
      screen.getAllByTitle("Incomplete: missing step references")
    ).toHaveLength(3);
    // El paso End nunca es incompleto: muestra su etiqueta de tipo.
    expect(within(sidebarCard("AR-E01")).getByText("End")).toBeInTheDocument();
  });

  it("selects another step from the sidebar", async () => {
    const user = userEvent.setup();
    renderEditor(makeValidFlow(), "edit");

    await user.click(screen.getByText("Is the ramp compliant?"));

    expect(screen.getByRole("heading", { name: "AR-Q01" })).toBeInTheDocument();
    expect(textboxIn("Step ID")).toHaveValue("AR-Q01");
  });

  it("filters steps by id, question text and form title", async () => {
    const user = userEvent.setup();
    renderEditor(makeValidFlow(), "edit");
    const search = screen.getByPlaceholderText("Search steps...");

    await user.type(search, "q01");
    expect(sidebarOrder()).toEqual(["AR-Q01"]);

    await user.clear(search);
    await user.type(search, "compliant");
    expect(sidebarOrder()).toEqual(["AR-Q01"]);

    await user.clear(search);
    await user.type(search, "record");
    expect(sidebarOrder()).toEqual(["AR-F01"]);

    await user.clear(search);
    await user.type(search, "nothing-matches");
    expect(sidebarOrder()).toEqual([]);
  });

  it("hides the drag handles while a search term is active", async () => {
    const user = userEvent.setup();
    renderEditor(makeValidFlow(), "edit");

    expect(screen.getAllByTitle("Drag to reorder")).toHaveLength(4);

    await user.type(screen.getByPlaceholderText("Search steps..."), "AR-");

    expect(screen.queryByTitle("Drag to reorder")).not.toBeInTheDocument();
  });

  it("opens and closes the help modal", async () => {
    const user = userEvent.setup();
    renderEditor(makeValidFlow(), "edit");

    await user.click(screen.getByTitle("How to create a flow"));

    expect(
      screen.getByRole("heading", { name: "How to Create a Flow" })
    ).toBeInTheDocument();
    expect(screen.getByText("Set Flow Details")).toBeInTheDocument();
    expect(
      screen.getByText("Advanced: Double Dipping & Shared Forms")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Got it!" }));

    expect(
      screen.queryByRole("heading", { name: "How to Create a Flow" })
    ).not.toBeInTheDocument();
  });

  it("marks the flow as dirty when the title changes and discards on confirm", async () => {
    const user = userEvent.setup();
    renderEditor(makeValidFlow(), "edit");

    await user.type(screen.getByPlaceholderText("Untitled Flow"), " v2");
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /discard/i }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByPlaceholderText("Untitled Flow")).toHaveValue("Ramps");
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
  });

  it("keeps the changes when the discard confirmation is declined", async () => {
    confirmSpy.mockReturnValue(false);
    const user = userEvent.setup();
    renderEditor(makeValidFlow(), "edit");

    await user.type(
      screen.getByPlaceholderText("Add a description (optional)..."),
      "!"
    );
    await user.click(screen.getByRole("button", { name: /discard/i }));

    expect(
      screen.getByPlaceholderText("Add a description (optional)...")
    ).toHaveValue("Ramp audit flow!");
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("renders an empty description input when the flow description is null", () => {
    const flow = makeValidFlow();
    flow.description = null;
    renderEditor(flow, "edit");

    expect(
      screen.getByPlaceholderText("Add a description (optional)...")
    ).toHaveValue("");
  });

  it("disables every mutating control for non administrators", () => {
    sessionMock.mockReturnValue({ isAdmin: false });
    renderEditor(makeValidFlow(), "edit");

    expect(
      screen.getByTitle("Only administrators can save flows")
    ).toBeDisabled();
    expect(
      screen.getAllByTitle("Only administrators can delete steps")[0]
    ).toBeDisabled();
    for (const button of screen.getAllByTitle("Only administrators can add steps")) {
      expect(button).toBeDisabled();
    }
    expect(screen.queryByTitle("Drag to reorder")).not.toBeInTheDocument();
  });

  it("disables the discard button for non administrators", async () => {
    sessionMock.mockReturnValue({ isAdmin: false });
    const user = userEvent.setup();
    renderEditor(makeValidFlow(), "edit");

    await user.type(screen.getByPlaceholderText("Untitled Flow"), "x");

    expect(
      screen.getByTitle("Only administrators can discard changes")
    ).toBeDisabled();
  });

  it("renders the End step detail with only the shared id field", async () => {
    const user = userEvent.setup();
    renderEditor(makeValidFlow(), "edit");

    await user.click(screen.getByText("End of flow"));

    expect(screen.getByRole("heading", { name: "AR-E01" })).toBeInTheDocument();
    expect(textboxIn("Step ID")).toHaveValue("AR-E01");
    expect(screen.queryByText("Question Text")).not.toBeInTheDocument();
    expect(screen.queryByText("Options")).not.toBeInTheDocument();
    expect(screen.queryByText("Fields")).not.toBeInTheDocument();
  });

  it("renders the Question detail fields", async () => {
    const user = userEvent.setup();
    renderEditor(makeValidFlow(), "edit");

    await user.click(screen.getByText("Is the ramp compliant?"));

    expect(screen.getByPlaceholderText("Enter question text")).toHaveValue(
      "Is the ramp compliant?"
    );
    expect(comboboxIn("Yes")).toHaveValue("AR-F01");
    expect(comboboxIn("No")).toHaveValue("AR-E01");
    expect(screen.getByPlaceholderText("e.g. AR-B01")).toHaveValue("");
    expect(
      screen.getByRole("button", { name: /Conditional YES Navigation/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Conditional NO Navigation/ })
    ).toBeInTheDocument();
  });

  it("renders the Select detail fields", () => {
    renderEditor(makeValidFlow(), "edit");

    expect(within(fieldRow("Title / Text")).getByRole("textbox")).toHaveValue(
      "Choose the barrier"
    );
    expect(screen.getByDisplayValue("Door")).toBeInTheDocument();
    expect(screen.getByDisplayValue("AR-B02")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add option/i })
    ).toBeInTheDocument();
  });

  it("renders the Form detail fields", async () => {
    const user = userEvent.setup();
    renderEditor(makeValidFlow(), "edit");

    await user.click(screen.getByText("Record quantity"));

    expect(within(fieldRow("Title")).getByRole("textbox")).toHaveValue(
      "Record quantity"
    );
    expect(comboboxIn("Next Step")).toHaveValue("AR-E01");
    expect(screen.getByDisplayValue("Quantity")).toBeInTheDocument();
    expect(screen.getByText("(None)")).toBeInTheDocument();
  });

  it("shows the persisted shared quantity barriers of a Form step", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [
      makeSelectStep(),
      makeQuestionStep(),
      makeFormStep({
        metadata: { sharedQuantity: { appliesToBarriers: ["AR-B01", "AR-B02"] } },
      }),
      makeEndStep(),
    ];
    renderEditor(flow, "edit");

    await user.click(screen.getByText("Record quantity"));

    expect(screen.getByText("AR-B01, AR-B02")).toBeInTheDocument();
  });
});
