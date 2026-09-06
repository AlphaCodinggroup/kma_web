import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Flow, FormStep, QuestionStep, SelectStep } from "@entities/flow/model";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  getPresignedUrl: vi.fn(),
  uploadFile: vi.fn(),
  invalidateQueries: vi.fn(),
  push: vi.fn(),
  isAdmin: true,
}));

vi.mock("@features/flows/api/flows.repo.impl", () => ({
  flowsRepo: {
    create: mocks.create,
    update: mocks.update,
    getPresignedUrl: mocks.getPresignedUrl,
    uploadFile: mocks.uploadFile,
  },
}));
vi.mock("@features/flows/lib/useFlowsQuery", () => ({
  flowsKeys: {
    list: () => ["flows", "list"],
    detail: (id: string) => ["flows", "detail", id],
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock("@processes/auth/hooks", () => ({
  useSession: () => ({ isAdmin: mocks.isAdmin }),
}));

import { FlowEditor } from "./FlowEditor";

const baseFlow: Flow = {
  id: "flow-1",
  title: "Accessibility flow",
  description: "Checks",
  version: 1,
  steps: [
    {
      id: "S1",
      type: "Select",
      title: "Choose area",
      options: [{ label: "Lobby", next: "Q1", barrierId: "BS" }],
    },
    {
      id: "Q1",
      type: "Question",
      text: "Is it accessible?",
      yesNext: "F1",
      noNext: "E1",
      barrierId: "BQ",
    },
    {
      id: "F1",
      type: "Form",
      title: "Record finding",
      next: "E1",
      fields: [{ id: "measurements_1", type: "number", label: "Width", unit: "cm" }],
    },
    { id: "E1", type: "End" },
  ],
};

// clone keeps every test working on its own copy of the fixture.
const clone = (flow: Flow): Flow => JSON.parse(JSON.stringify(flow)) as Flow;

// selectStep clicks the sidebar entry of the given step.
const selectStep = async (user: ReturnType<typeof userEvent.setup>, stepId: string) => {
  await user.click(screen.getAllByText(stepId)[0]);
};

// savedFlow returns the flow persisted by the last update call.
const savedFlow = (): Flow => mocks.update.mock.calls.at(-1)![1] as Flow;

// dataTransferStub is the minimal surface the drag handlers touch.
const dataTransferStub = () => ({
  setData: vi.fn(),
  getData: vi.fn(),
  dropEffect: "",
  effectAllowed: "",
});

describe("FlowEditor interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAdmin = true;
    mocks.update.mockResolvedValue(baseFlow);
    mocks.create.mockResolvedValue(baseFlow);
    localStorage.clear();
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal("alert", vi.fn());
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe("draft recovery", () => {
    const draft: Flow = { ...clone(baseFlow), title: "Recovered title" };

    it("restores the stored draft", async () => {
      const user = userEvent.setup();
      localStorage.setItem(
        "flow-editor-draft-flow-1",
        JSON.stringify({ flow: draft, savedAt: "2026-09-01T10:00:00Z" }),
      );

      render(<FlowEditor initialFlow={clone(baseFlow)} />);
      expect(screen.getByRole("heading", { name: "Borrador encontrado" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Recuperar borrador" }));
      expect(screen.getByDisplayValue("Recovered title")).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Borrador encontrado" })).not.toBeInTheDocument();
    });

    it("discards the stored draft and clears the storage", async () => {
      const user = userEvent.setup();
      localStorage.setItem(
        "flow-editor-draft-flow-1",
        JSON.stringify({ flow: draft, savedAt: "2026-09-01T10:00:00Z" }),
      );

      render(<FlowEditor initialFlow={clone(baseFlow)} />);
      await user.click(screen.getByRole("button", { name: "Descartar y empezar limpio" }));

      expect(screen.getByDisplayValue("Accessibility flow")).toBeInTheDocument();
      expect(localStorage.getItem("flow-editor-draft-flow-1")).toBeNull();
    });

    it("ignores a draft identical to the initial flow", () => {
      localStorage.setItem(
        "flow-editor-draft-flow-1",
        JSON.stringify({ flow: baseFlow, savedAt: "2026-09-01T10:00:00Z" }),
      );

      render(<FlowEditor initialFlow={clone(baseFlow)} />);
      expect(screen.queryByRole("heading", { name: "Borrador encontrado" })).not.toBeInTheDocument();
    });

    it("survives a corrupt draft", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem("flow-editor-draft-flow-1", "{not-json");

      render(<FlowEditor initialFlow={clone(baseFlow)} />);
      expect(screen.queryByRole("heading", { name: "Borrador encontrado" })).not.toBeInTheDocument();
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it("auto-saves the draft after the inactivity window", () => {
      vi.useFakeTimers();
      render(<FlowEditor initialFlow={clone(baseFlow)} />);

      fireEvent.change(screen.getByDisplayValue("Accessibility flow"), {
        target: { value: "Draft title" },
      });
      vi.advanceTimersByTime(10_000);

      const stored = JSON.parse(localStorage.getItem("flow-editor-draft-flow-1")!) as { flow: Flow };
      expect(stored.flow.title).toBe("Draft title");
    });
  });

  describe("data loss protection", () => {
    it("blocks the unload while there are unsaved changes", () => {
      render(<FlowEditor initialFlow={clone(baseFlow)} />);
      fireEvent.change(screen.getByDisplayValue("Accessibility flow"), {
        target: { value: "Changed" },
      });

      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });

    it("lets the unload through when the flow is untouched", () => {
      render(<FlowEditor initialFlow={clone(baseFlow)} />);

      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe("discard", () => {
    it("returns to the initial flow once confirmed", async () => {
      const user = userEvent.setup();
      render(<FlowEditor initialFlow={clone(baseFlow)} />);

      fireEvent.change(screen.getByDisplayValue("Accessibility flow"), {
        target: { value: "Changed" },
      });
      await user.click(screen.getByRole("button", { name: "Discard" }));

      expect(screen.getByDisplayValue("Accessibility flow")).toBeInTheDocument();
      expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
    });

    it("keeps the changes when the confirmation is dismissed", async () => {
      const user = userEvent.setup();
      vi.stubGlobal("confirm", vi.fn(() => false));
      render(<FlowEditor initialFlow={clone(baseFlow)} />);

      fireEvent.change(screen.getByDisplayValue("Accessibility flow"), {
        target: { value: "Changed" },
      });
      await user.click(screen.getByRole("button", { name: "Discard" }));

      expect(screen.getByDisplayValue("Changed")).toBeInTheDocument();
    });
  });

  describe("step reordering", () => {
    // stepCard walks up from the sidebar label to the draggable container.
    const stepCard = (stepId: string) => screen.getAllByText(stepId)[0].closest("[draggable]")!;

    it("moves the dragged step to the drop position", async () => {
      const user = userEvent.setup();
      render(<FlowEditor initialFlow={clone(baseFlow)} />);

      const source = stepCard("F1");
      const target = stepCard("S1");
      const dataTransfer = dataTransferStub();

      fireEvent.dragStart(source, { dataTransfer });
      fireEvent.dragEnter(target, { dataTransfer });
      fireEvent.dragOver(target, { dataTransfer });
      fireEvent.drop(target, { dataTransfer });

      expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "F1");

      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      await waitFor(() => expect(mocks.update).toHaveBeenCalled());
      expect(savedFlow().steps.map((step) => step.id)).toEqual(["F1", "S1", "Q1", "E1"]);
    });

    it("keeps the order when a step is dropped on itself", async () => {
      const user = userEvent.setup();
      render(<FlowEditor initialFlow={clone(baseFlow)} />);

      const source = stepCard("F1");
      const dataTransfer = dataTransferStub();

      fireEvent.dragStart(source, { dataTransfer });
      fireEvent.dragEnter(source, { dataTransfer });
      fireEvent.dragLeave(source, { dataTransfer });
      fireEvent.drop(source, { dataTransfer });
      fireEvent.dragEnd(source, { dataTransfer });

      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      await waitFor(() => expect(mocks.update).toHaveBeenCalled());
      expect(savedFlow().steps.map((step) => step.id)).toEqual(["S1", "Q1", "F1", "E1"]);
    });

    it("ignores a drop that never started", async () => {
      const user = userEvent.setup();
      render(<FlowEditor initialFlow={clone(baseFlow)} />);

      fireEvent.drop(stepCard("S1"), { dataTransfer: dataTransferStub() });

      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      await waitFor(() => expect(mocks.update).toHaveBeenCalled());
      expect(savedFlow().steps.map((step) => step.id)).toEqual(["S1", "Q1", "F1", "E1"]);
    });

    it("never starts a drag for a viewer", () => {
      mocks.isAdmin = false;
      render(<FlowEditor initialFlow={clone(baseFlow)} />);

      const dataTransfer = dataTransferStub();
      fireEvent.dragStart(screen.getAllByText("F1")[0].closest("div")!, { dataTransfer });
      expect(dataTransfer.setData).not.toHaveBeenCalled();
    });
  });

  describe("step management", () => {
    it("appends a step and selects it when nothing can be auto-linked", async () => {
      const user = userEvent.setup();
      render(<FlowEditor initialFlow={clone(baseFlow)} />);

      await selectStep(user, "E1");
      await user.click(screen.getByRole("button", { name: "End" }));

      expect(screen.getByDisplayValue("S1-E02")).toBeInTheDocument();
    });

    it("offers the auto-link modal when the selected step has an empty link", async () => {
      const user = userEvent.setup();
      const flow = clone(baseFlow);
      (flow.steps[1] as QuestionStep).yesNext = "";
      (flow.steps[1] as QuestionStep).noNext = "";
      render(<FlowEditor initialFlow={flow} />);

      await selectStep(user, "Q1");
      await user.click(screen.getByRole("button", { name: "Form" }));

      expect(screen.getByRole("heading", { name: "Link New Step?" })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /Link to:\s*Both \(Yes & No\)/ }));

      expect(screen.getByDisplayValue("S1-F02")).toBeInTheDocument();
      await selectStep(user, "Q1");
      const selectors = screen.getAllByRole("combobox");
      expect(selectors[0]).toHaveValue("S1-F02");
      expect(selectors[1]).toHaveValue("S1-F02");
    });

    it("links only the chosen field", async () => {
      const user = userEvent.setup();
      const flow = clone(baseFlow);
      (flow.steps[1] as QuestionStep).noNext = "";
      render(<FlowEditor initialFlow={flow} />);

      await selectStep(user, "Q1");
      await user.click(screen.getByRole("button", { name: "End" }));
      await user.click(screen.getByRole("button", { name: /Link to:\s*No/ }));

      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      await waitFor(() => expect(mocks.update).toHaveBeenCalled());
      const question = savedFlow().steps.find((step) => step.id === "Q1") as QuestionStep;
      expect(question.noNext).toBe("S1-E02");
      expect(question.yesNext).toBe("F1");
    });

    it("links an empty select option", async () => {
      const user = userEvent.setup();
      const flow = clone(baseFlow);
      (flow.steps[0] as SelectStep).options[0].next = "";
      render(<FlowEditor initialFlow={flow} />);

      await selectStep(user, "S1");
      await user.click(screen.getByRole("button", { name: "End" }));
      await user.click(screen.getByRole("button", { name: /Link to:\s*Option 1/ }));

      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      await waitFor(() => expect(mocks.update).toHaveBeenCalled());
      const select = savedFlow().steps.find((step) => step.id === "S1") as SelectStep;
      expect(select.options[0].next).toBe("S1-E02");
    });

    it("links an empty form next step", async () => {
      const user = userEvent.setup();
      const flow = clone(baseFlow);
      (flow.steps[2] as FormStep).next = "";
      render(<FlowEditor initialFlow={flow} />);

      await selectStep(user, "F1");
      await user.click(screen.getByRole("button", { name: "End" }));
      await user.click(screen.getByRole("button", { name: /Link to:\s*Next/ }));

      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      await waitFor(() => expect(mocks.update).toHaveBeenCalled());
      const form = savedFlow().steps.find((step) => step.id === "F1") as FormStep;
      expect(form.next).toBe("S1-E02");
    });

    it("selects the new step when the auto-link is cancelled", async () => {
      const user = userEvent.setup();
      const flow = clone(baseFlow);
      (flow.steps[1] as QuestionStep).noNext = "";
      render(<FlowEditor initialFlow={flow} />);

      await selectStep(user, "Q1");
      await user.click(screen.getByRole("button", { name: "End" }));
      await user.click(screen.getByRole("button", { name: "Skip" }));

      expect(screen.getByDisplayValue("S1-E02")).toBeInTheDocument();
    });

    it("creates and links a step straight from the selector", async () => {
      const user = userEvent.setup();
      render(<FlowEditor initialFlow={clone(baseFlow)} />);

      await selectStep(user, "Q1");
      const createButton = screen.getAllByTitle("Create new step and link here")[0];
      await user.click(createButton);
      await user.click(within(createButton.parentElement!).getByRole("button", { name: "Select" }));

      expect(screen.getByDisplayValue("S1-S02")).toBeInTheDocument();
      await selectStep(user, "Q1");
      expect(screen.getAllByRole("combobox")[0]).toHaveValue("S1-S02");
    });

    it("closes the create menu when clicking outside", async () => {
      const user = userEvent.setup();
      render(<FlowEditor initialFlow={clone(baseFlow)} />);

      await selectStep(user, "Q1");
      const createButton = screen.getAllByTitle("Create new step and link here")[0];
      const menu = createButton.parentElement!;
      await user.click(createButton);
      expect(within(menu).getByRole("button", { name: "Select" })).toBeInTheDocument();

      fireEvent.mouseDown(document.body);
      await waitFor(() =>
        expect(within(menu).queryByRole("button", { name: "Select" })).not.toBeInTheDocument(),
      );
    });

    it("deletes a step once confirmed and moves the selection", async () => {
      const user = userEvent.setup();
      render(<FlowEditor initialFlow={clone(baseFlow)} />);

      await user.click(screen.getAllByTitle("Delete step")[0]);
      expect(screen.queryAllByText("S1")).toHaveLength(0);
      expect(screen.getByDisplayValue("Is it accessible?")).toBeInTheDocument();
    });

    it("keeps the step when the deletion is dismissed", async () => {
      const user = userEvent.setup();
      vi.stubGlobal("confirm", vi.fn(() => false));
      render(<FlowEditor initialFlow={clone(baseFlow)} />);

      await user.click(screen.getAllByTitle("Delete step")[0]);
      expect(screen.getAllByText("S1").length).toBeGreaterThan(0);
    });

    it("renames a step and keeps it selected", async () => {
      const user = userEvent.setup();
      render(<FlowEditor initialFlow={clone(baseFlow)} />);

      fireEvent.change(screen.getByDisplayValue("S1"), { target: { value: "S9" } });
      expect(screen.getByDisplayValue("S9")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Choose area")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      await waitFor(() => expect(mocks.update).toHaveBeenCalled());
      expect(savedFlow().steps[0].id).toBe("S9");
    });
  });

  describe("question editor", () => {
    it("edits the question text and its barrier", async () => {
      const user = userEvent.setup();
      render(<FlowEditor initialFlow={clone(baseFlow)} />);
      await selectStep(user, "Q1");

      fireEvent.change(screen.getByPlaceholderText("Enter question text"), {
        target: { value: "Is the ramp usable?" },
      });
      fireEvent.change(screen.getByPlaceholderText("e.g. AR-B01"), {
        target: { value: "AR-B09" },
      });

      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      await waitFor(() => expect(mocks.update).toHaveBeenCalled());
      expect(savedFlow().steps.find((step) => step.id === "Q1")).toMatchObject({
        text: "Is the ramp usable?",
        barrierId: "AR-B09",
      });
    });

    it("re-points the yes and no branches", async () => {
      const user = userEvent.setup();
      render(<FlowEditor initialFlow={clone(baseFlow)} />);
      await selectStep(user, "Q1");

      fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "F1" } });
      fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "E1" } });

      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      await waitFor(() => expect(mocks.update).toHaveBeenCalled());
      const question = savedFlow().steps.find((step) => step.id === "Q1") as QuestionStep;
      expect(question.yesNext).toBe("E1");
      expect(question.noNext).toBe("F1");
    });
  });

  describe("conditional navigation", () => {
    // conditionalPanel returns the section of the given conditional editor.
    const conditionalPanel = (label: string) =>
      screen.getAllByText(label).find((node) => node.closest("button"))!.closest("button")!
        .parentElement!;

    it("enables, configures and clears a conditional path", async () => {
      const user = userEvent.setup();
      render(<FlowEditor initialFlow={clone(baseFlow)} />);
      await selectStep(user, "Q1");

      const panel = () => conditionalPanel("Conditional YES Navigation");
      await user.click(within(panel()).getAllByRole("button")[0]);
      await user.click(within(panel()).getAllByRole("checkbox")[0]);

      await user.click(within(panel()).getByRole("button", { name: /Add Condition/ }));
      fireEvent.change(within(panel()).getAllByRole("combobox")[0], { target: { value: "F1" } });
      fireEvent.change(within(panel()).getAllByRole("combobox")[1], { target: { value: "S1" } });
      fireEvent.change(within(panel()).getAllByRole("combobox")[2], { target: { value: "Lobby" } });
      await user.click(within(panel()).getByLabelText(/Match ANY condition/));

      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      await waitFor(() => expect(mocks.update).toHaveBeenCalled());
      const question = savedFlow().steps.find((step) => step.id === "Q1") as QuestionStep;
      expect(question.conditionalYesNext).toMatchObject({
        next: "F1",
        match_any: true,
        conditions: [{ step_id: "S1", selected_option: "Lobby" }],
      });
    });

    it("records the answer of a question condition and deletes it", async () => {
      const user = userEvent.setup();
      const flow = clone(baseFlow);
      flow.steps.push({ id: "Q2", type: "Question", text: "Second?", yesNext: "E1", noNext: "E1" });
      render(<FlowEditor initialFlow={flow} />);
      await selectStep(user, "Q2");

      const panel = () => conditionalPanel("Conditional NO Navigation");
      await user.click(within(panel()).getAllByRole("button")[0]);
      await user.click(within(panel()).getAllByRole("checkbox")[0]);
      await user.click(within(panel()).getByRole("button", { name: /Add Condition/ }));

      fireEvent.change(within(panel()).getAllByRole("combobox")[1], { target: { value: "Q1" } });
      fireEvent.change(within(panel()).getAllByRole("combobox")[2], { target: { value: "NO" } });

      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      await waitFor(() => expect(mocks.update).toHaveBeenCalled());
      let question = savedFlow().steps.find((step) => step.id === "Q2") as QuestionStep;
      expect(question.conditionalNoNext!.conditions).toEqual([{ step_id: "Q1", answer: "NO" }]);

      const removeButtons = within(panel()).getAllByRole("button");
      await user.click(removeButtons[removeButtons.length - 2]);

      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(2));
      question = savedFlow().steps.find((step) => step.id === "Q2") as QuestionStep;
      expect(question.conditionalNoNext!.conditions).toEqual([]);
    });

    it("collapses and disables the conditional editor", async () => {
      const user = userEvent.setup();
      const flow = clone(baseFlow);
      (flow.steps[1] as QuestionStep).conditionalYesNext = {
        next: "F1",
        conditions: [{ step_id: "S1", selected_option: "Lobby" }],
      };
      render(<FlowEditor initialFlow={flow} />);
      await selectStep(user, "Q1");

      const panel = () => conditionalPanel("Conditional YES Navigation");
      expect(within(panel()).getByText("1 condition(s)")).toBeInTheDocument();

      await user.click(within(panel()).getAllByRole("checkbox")[0]);
      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      await waitFor(() => expect(mocks.update).toHaveBeenCalled());
      const question = savedFlow().steps.find((step) => step.id === "Q1") as QuestionStep;
      expect(question.conditionalYesNext).toBeUndefined();
    });
  });

  describe("select editor", () => {
    it("adds, edits and removes options", async () => {
      const user = userEvent.setup();
      render(<FlowEditor initialFlow={clone(baseFlow)} />);

      fireEvent.change(screen.getByDisplayValue("Choose area"), {
        target: { value: "Pick the area" },
      });
      fireEvent.change(screen.getByDisplayValue("Lobby"), { target: { value: "Main lobby" } });
      fireEvent.change(screen.getByDisplayValue("BS"), { target: { value: "BS-02" } });

      await user.click(screen.getByRole("button", { name: /Add Option/ }));
      expect(screen.getByDisplayValue("New Option")).toBeInTheDocument();
      fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "E1" } });

      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      await waitFor(() => expect(mocks.update).toHaveBeenCalled());
      let select = savedFlow().steps.find((step) => step.id === "S1") as SelectStep;
      expect(select.title).toBe("Pick the area");
      expect(select.options).toHaveLength(2);
      expect(select.options[0]).toMatchObject({ label: "Main lobby", barrierId: "BS-02" });

      const optionCard = screen.getByDisplayValue("New Option").closest(".group") as HTMLElement;
      await user.click(within(optionCard).getAllByRole("button").at(-1)!);

      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(2));
      select = savedFlow().steps.find((step) => step.id === "S1") as SelectStep;
      expect(select.options).toHaveLength(1);
    });

    it("re-points an option to another step", async () => {
      const user = userEvent.setup();
      render(<FlowEditor initialFlow={clone(baseFlow)} />);

      fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "E1" } });

      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      await waitFor(() => expect(mocks.update).toHaveBeenCalled());
      const select = savedFlow().steps.find((step) => step.id === "S1") as SelectStep;
      expect(select.options[0].next).toBe("E1");
    });
  });

  describe("form editor", () => {
    it("adds every field type once and rejects the duplicates", async () => {
      const user = userEvent.setup();
      render(<FlowEditor initialFlow={clone(baseFlow)} />);
      await selectStep(user, "F1");

      await user.click(screen.getByRole("button", { name: /Quantity/ }));
      await user.click(screen.getByRole("button", { name: /Photo/ }));
      await user.click(screen.getByRole("button", { name: /Notes/ }));
      await user.click(screen.getByRole("button", { name: /Measurement/ }));

      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      await waitFor(() => expect(mocks.update).toHaveBeenCalled());
      const form = savedFlow().steps.find((step) => step.id === "F1") as FormStep;
      expect(form.fields.map((field) => field.id)).toEqual([
        "measurements_1",
        "quantity",
        "photo",
        "notes",
        "measurements_2",
      ]);
    });

    it("disables the buttons of the fields already present", async () => {
      const user = userEvent.setup();
      const flow = clone(baseFlow);
      (flow.steps[2] as FormStep).fields = [];
      render(<FlowEditor initialFlow={flow} />);
      await selectStep(user, "F1");

      await user.click(screen.getByRole("button", { name: /Quantity/ }));
      expect(screen.getByRole("button", { name: /Quantity/ })).toBeDisabled();
      expect(screen.getByRole("button", { name: /Measurement/ })).toBeEnabled();
    });

    it("edits the title, the next step, a field label, its unit and its placeholder", async () => {
      const user = userEvent.setup();
      render(<FlowEditor initialFlow={clone(baseFlow)} />);
      await selectStep(user, "F1");

      fireEvent.change(screen.getByDisplayValue("Record finding"), {
        target: { value: "Record barrier" },
      });
      fireEvent.change(screen.getByDisplayValue("Width"), { target: { value: "Clear width" } });
      fireEvent.change(screen.getByDisplayValue("cm"), { target: { value: "%" } });
      fireEvent.change(screen.getByPlaceholderText("Optional placeholder..."), {
        target: { value: "In centimetres" },
      });

      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      await waitFor(() => expect(mocks.update).toHaveBeenCalled());
      const form = savedFlow().steps.find((step) => step.id === "F1") as FormStep;
      expect(form.title).toBe("Record barrier");
      expect(form.fields[0]).toMatchObject({
        label: "Clear width",
        unit: "%",
        placeholder: "In centimetres",
      });
    });

    it("removes a field", async () => {
      const user = userEvent.setup();
      render(<FlowEditor initialFlow={clone(baseFlow)} />);
      await selectStep(user, "F1");

      const fieldRow = screen.getByDisplayValue("Width").closest(".flex") as HTMLElement;
      await user.click(within(fieldRow).getAllByRole("button").at(-1)!);

      expect(screen.queryByDisplayValue("Width")).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      expect(screen.getByText("Step F1: At least one field is required.")).toBeInTheDocument();
    });
  });

  describe("images", () => {
    beforeEach(() => {
      vi.stubGlobal("URL", {
        ...URL,
        createObjectURL: vi.fn(() => "blob:preview-1"),
        revokeObjectURL: vi.fn(),
      });
    });

    // attachFile pushes a file through the hidden input the editor owns.
    const attachFile = (name = "photo.png") => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["x"], name, { type: "image/png" });
      fireEvent.change(input, { target: { files: [file] } });
      return file;
    };

    it("previews an attached image, zooms it and removes it", async () => {
      const user = userEvent.setup();
      render(<FlowEditor initialFlow={clone(baseFlow)} />);

      await user.click(screen.getByRole("button", { name: /Add Image/ }));
      attachFile();

      const preview = screen.getByAltText("Step 0");
      expect(preview).toHaveAttribute("src", "blob:preview-1");

      await user.click(preview);
      expect(screen.getByAltText("Zoomed View")).toBeInTheDocument();
      const zoomed = screen.getByAltText("Zoomed View").parentElement!;
      await user.click(within(zoomed).getByRole("button"));
      expect(screen.queryByAltText("Zoomed View")).not.toBeInTheDocument();

      await user.click(screen.getByTitle("Add another image"));

      const card = preview.parentElement!;
      await user.click(within(card).getByRole("button"));
      expect(screen.queryByAltText("Step 0")).not.toBeInTheDocument();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-1");
    });

    it("ignores an empty selection", async () => {
      const user = userEvent.setup();
      render(<FlowEditor initialFlow={clone(baseFlow)} />);

      await user.click(screen.getByRole("button", { name: /Add Image/ }));
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [] } });

      expect(screen.queryByAltText("Step 0")).not.toBeInTheDocument();
    });

    it("uploads the pending files and stores their public urls", async () => {
      const user = userEvent.setup();
      mocks.getPresignedUrl.mockResolvedValue({
        uploadUrl: "https://upload.example/put",
        publicUrl: "https://cdn.example/photo.png",
      });
      mocks.uploadFile.mockResolvedValue(undefined);

      render(<FlowEditor initialFlow={clone(baseFlow)} />);
      await user.click(screen.getByRole("button", { name: /Add Image/ }));
      attachFile();

      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      await waitFor(() => expect(mocks.update).toHaveBeenCalled());
      expect(mocks.uploadFile).toHaveBeenCalledWith("https://upload.example/put", expect.any(File));
      const select = savedFlow().steps.find((step) => step.id === "S1")!;
      expect(select.images).toEqual(["https://cdn.example/photo.png"]);
    });

    it("removes a stored image without revoking an object url", async () => {
      const user = userEvent.setup();
      const flow = clone(baseFlow);
      flow.steps[0].images = ["https://cdn.example/stored.png"];
      render(<FlowEditor initialFlow={flow} />);

      const card = screen.getByAltText("Step 0").parentElement!;
      await user.click(within(card).getByRole("button"));

      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
      expect(screen.queryByAltText("Step 0")).not.toBeInTheDocument();
    });
  });

  describe("saving", () => {
    it("creates a brand new flow", async () => {
      const user = userEvent.setup();
      render(<FlowEditor initialFlow={{ ...clone(baseFlow), id: "new" }} />);

      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
      expect(mocks.update).not.toHaveBeenCalled();
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["flows", "list"] });
    });

    it("reports a failed save", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const user = userEvent.setup();
      mocks.update.mockRejectedValue(new Error("network down"));

      render(<FlowEditor initialFlow={clone(baseFlow)} />);
      await user.click(screen.getByRole("button", { name: "Save Flow" }));

      expect(await screen.findByRole("heading", { name: "Save Failed" })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Fix Errors" }));
      expect(mocks.push).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it("clears a stale shared quantity when no conditional points at the form", async () => {
      const user = userEvent.setup();
      const flow = clone(baseFlow);
      (flow.steps[2] as FormStep).metadata = {
        sharedQuantity: { appliesToBarriers: ["OLD"] },
      };
      render(<FlowEditor initialFlow={flow} />);

      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      await waitFor(() => expect(mocks.update).toHaveBeenCalled());
      const form = savedFlow().steps.find((step) => step.id === "F1") as FormStep;
      expect(form.metadata?.sharedQuantity).toBeUndefined();
    });

    it("lists every validation error of every step type", async () => {
      const user = userEvent.setup();
      render(
        <FlowEditor
          initialFlow={{
            id: "flow-2",
            title: "Broken",
            version: 1,
            steps: [
              { id: "Q9", type: "Question", text: "" },
              { id: "F9", type: "Form", title: "", fields: [] },
              { id: "S9", type: "Select", text: "", options: [{ label: "x", next: "" }] },
            ],
          }}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      for (const message of [
        "Step Q9: Question text is required.",
        "Step Q9: 'Yes Next' step is required.",
        "Step Q9: 'No Next' step is required.",
        "Step F9: Form title is required.",
        "Step F9: 'Next Step' is required.",
        "Step F9: At least one field is required.",
        "Step S9: Title/Text is required.",
        'Step S9 (Option 1): \'Next Step\' is required.',
      ]) {
        expect(screen.getByText(message)).toBeInTheDocument();
      }
      expect(mocks.update).not.toHaveBeenCalled();
    });

    it("requires at least one option in a select step", async () => {
      const user = userEvent.setup();
      render(
        <FlowEditor
          initialFlow={{
            id: "flow-3",
            title: "Broken",
            version: 1,
            steps: [{ id: "S9", type: "Select", title: "Pick", options: [] }],
          }}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Save Flow" }));
      expect(screen.getByText("Step S9: At least one option is required.")).toBeInTheDocument();
    });
  });

  it("shows the empty detail panel when no step is selected", () => {
    render(<FlowEditor initialFlow={{ ...clone(baseFlow), steps: [] }} />);
    expect(screen.getByText("Select a step from the sidebar to edit")).toBeInTheDocument();
  });

  it("closes the feedback modal through the overlay", async () => {
    const user = userEvent.setup();
    render(<FlowEditor initialFlow={{ ...clone(baseFlow), title: "", steps: [] }} />);

    await user.click(screen.getByRole("button", { name: "Save Flow" }));
    expect(screen.getByRole("heading", { name: "Validation Error" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Validation Error" })).not.toBeInTheDocument(),
    );
  });
});
