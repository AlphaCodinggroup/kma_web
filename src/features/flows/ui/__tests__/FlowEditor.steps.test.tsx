// ---------------------------------------------------------------------------
// FlowEditor: alta, borrado, reordenamiento y renombrado de pasos, más el
// modal de auto-vinculación y el selector "Create & link".
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
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
  createDataTransfer,
  makeEndStep,
  makeFormStep,
  makeNewFlow,
  makeQuestionStep,
  makeSelectStep,
  createMenuItem,
  makeValidFlow,
  queryCreateMenuItem,
  renderEditor,
  sidebarCard,
  sidebarOrder,
  textboxIn,
} from "./flowEditorHarness";

/** Ejecuta la secuencia completa de eventos HTML5 de arrastre. */
function dragAndDrop(source: HTMLElement, target: HTMLElement) {
  const dataTransfer = createDataTransfer();
  fireEvent.dragStart(source, { dataTransfer });
  fireEvent.dragEnter(target, { dataTransfer });
  fireEvent.dragOver(target, { dataTransfer });
  fireEvent.drop(target, { dataTransfer });
  fireEvent.dragEnd(source, { dataTransfer });
}

describe("FlowEditor - step management", () => {
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

  // -- Alta ----------------------------------------------------------------

  it("adds the first step of an empty flow with the NEW prefix and selects it", async () => {
    const user = userEvent.setup();
    renderEditor(makeNewFlow(), "create");

    await user.click(screen.getByTitle("Add Question step"));

    expect(sidebarOrder()).toEqual(["NEW-Q01"]);
    expect(screen.getByRole("heading", { name: "NEW-Q01" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter question text")).toHaveValue("");
  });

  it("adds one step of every type reusing the prefix of the first step", async () => {
    const user = userEvent.setup();
    renderEditor(makeNewFlow(), "create");

    await user.click(screen.getByTitle("Add Select step"));
    await user.click(screen.getByTitle("Add End step"));
    await user.click(screen.getByTitle("Add Form step"));

    expect(sidebarOrder()).toEqual(["NEW-S01", "NEW-E01", "NEW-F01"]);
  });

  it("skips ids already taken when generating the new step id", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    // El id "AR-Q02" ya existe (en un paso End), así que el nuevo Question
    // debe saltar al siguiente número libre.
    flow.steps = [makeQuestionStep(), makeEndStep({ id: "AR-Q02" })];
    renderEditor(flow, "edit");

    await user.click(screen.getByTitle("Add Question step"));

    expect(sidebarOrder()).toEqual(["AR-Q01", "AR-Q02", "AR-Q03"]);
  });

  it("selects the new step directly when the current step has no empty links", async () => {
    const user = userEvent.setup();
    renderEditor(makeValidFlow(), "edit");

    await user.click(screen.getByText("Is the ramp compliant?"));
    await user.click(screen.getByTitle("Add End step"));

    expect(screen.queryByText("Link New Step?")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AR-E02" })).toBeInTheDocument();
  });

  // -- Modal de auto-vinculación -------------------------------------------

  it("offers linking both branches of a Question with two empty links", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [makeQuestionStep({ yesNext: "", noNext: "" })];
    renderEditor(flow, "edit");

    await user.click(screen.getByTitle("Add Form step"));

    expect(
      screen.getByRole("heading", { name: "Link New Step?" })
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("dialog")).getByText("AR-F01")
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Both \(Yes & No\)/ })
    );

    expect(screen.getByRole("heading", { name: "AR-F01" })).toBeInTheDocument();
    await user.click(screen.getByText("Is the ramp compliant?"));
    expect(comboboxIn("Yes")).toHaveValue("AR-F01");
    expect(comboboxIn("No")).toHaveValue("AR-F01");
  });

  it("links only the chosen branch of a Question", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [makeQuestionStep({ yesNext: "", noNext: "" })];
    renderEditor(flow, "edit");

    await user.click(screen.getByTitle("Add End step"));
    await user.click(screen.getByRole("button", { name: "Link to: No" }));

    await user.click(screen.getByText("Is the ramp compliant?"));
    expect(comboboxIn("Yes")).toHaveValue("");
    expect(comboboxIn("No")).toHaveValue("AR-E01");
  });

  it("offers only the Next field when the selected step is a Form", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [makeFormStep({ next: "" })];
    renderEditor(flow, "edit");

    await user.click(screen.getByTitle("Add End step"));
    await user.click(screen.getByRole("button", { name: "Link to: Next" }));

    await user.click(screen.getByText("Record quantity"));
    expect(comboboxIn("Next Step")).toHaveValue("AR-E01");
  });

  it("offers one entry per empty option when the selected step is a Select", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [
      makeSelectStep({
        options: [
          { label: "Door", next: "" },
          { label: "Ramp", next: "" },
        ],
      }),
    ];
    renderEditor(flow, "edit");

    await user.click(screen.getByTitle("Add End step"));

    expect(
      screen.getByRole("button", { name: 'Link to: Option 1: "Door"' })
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: 'Link to: Option 2: "Ramp"' })
    );

    await user.click(screen.getByText("Choose the barrier"));
    const [firstOption, secondOption] = screen.getAllByRole("combobox");
    expect(firstOption).toHaveValue("");
    expect(secondOption).toHaveValue("AR-E01");
  });

  it("keeps the new step unlinked and selected when the modal is skipped", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [makeQuestionStep({ yesNext: "", noNext: "" })];
    renderEditor(flow, "edit");

    await user.click(screen.getByTitle("Add End step"));
    await user.click(screen.getByRole("button", { name: "Skip" }));

    expect(screen.getByRole("heading", { name: "AR-E01" })).toBeInTheDocument();
    await user.click(screen.getByText("Is the ramp compliant?"));
    expect(comboboxIn("Yes")).toHaveValue("");
    expect(comboboxIn("No")).toHaveValue("");
  });

  it("cancels the auto-link modal when the overlay is clicked", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [makeQuestionStep({ yesNext: "", noNext: "" })];
    const { container } = renderEditor(flow, "edit");

    await user.click(screen.getByTitle("Add End step"));
    const overlay = container.querySelector("div.bg-black\\/40");
    await user.click(overlay as HTMLElement);

    expect(screen.queryByText("Link New Step?")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AR-E01" })).toBeInTheDocument();
  });

  // -- Create & link desde el selector -------------------------------------

  it("creates and links a step from the Next Step selector", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [makeFormStep({ next: "" })];
    renderEditor(flow, "edit");

    const createButton = screen.getByTitle("Create new step and link here");
    await user.click(createButton);
    await user.click(createMenuItem(createButton, "End"));

    // Queda seleccionado el paso nuevo; al volver al Form el link está puesto.
    expect(screen.getByRole("heading", { name: "AR-E01" })).toBeInTheDocument();
    await user.click(screen.getByText("Record quantity"));
    expect(comboboxIn("Next Step")).toHaveValue("AR-E01");
  });

  it("creates and links a step from a Select option", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [makeSelectStep({ options: [{ label: "Door", next: "" }] })];
    renderEditor(flow, "edit");

    const createButton = screen.getByTitle("Create new step and link here");
    await user.click(createButton);
    await user.click(createMenuItem(createButton, "Question"));

    expect(screen.getByRole("heading", { name: "AR-Q01" })).toBeInTheDocument();
    await user.click(screen.getByText("Choose the barrier"));
    expect(screen.getAllByRole("combobox")[0]).toHaveValue("AR-Q01");
  });

  it("creates and links both branches of a Question independently", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [makeQuestionStep({ yesNext: "", noNext: "" })];
    renderEditor(flow, "edit");

    const yesCreate = screen.getAllByTitle("Create new step and link here")[0] as HTMLElement;
    await user.click(yesCreate);
    await user.click(createMenuItem(yesCreate, "Form"));

    await user.click(screen.getByText("Is the ramp compliant?"));
    const noCreate = screen.getAllByTitle("Create new step and link here")[1] as HTMLElement;
    await user.click(noCreate);
    await user.click(createMenuItem(noCreate, "End"));

    await user.click(screen.getByText("Is the ramp compliant?"));
    expect(comboboxIn("Yes")).toHaveValue("AR-F01");
    expect(comboboxIn("No")).toHaveValue("AR-E01");
  });

  it("closes the create menu when clicking outside of it", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [makeFormStep({ next: "" })];
    renderEditor(flow, "edit");

    const createButton = screen.getByTitle("Create new step and link here");
    await user.click(createButton);
    expect(createMenuItem(createButton, "Select")).toBeInTheDocument();

    await user.click(screen.getByText("Editing step details"));

    expect(queryCreateMenuItem(createButton, "Select")).toBeNull();
  });

  it("hides the current step and forms already taken from the step selector", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    // AR-F01 ya está usado por AR-Q01, así que no debe ofrecerse a AR-Q02.
    flow.steps = [
      makeQuestionStep({ id: "AR-Q01", yesNext: "AR-F01", noNext: "AR-E01" }),
      makeQuestionStep({ id: "AR-Q02", yesNext: "", noNext: "" }),
      makeFormStep(),
      makeEndStep(),
    ];
    renderEditor(flow, "edit");

    await user.click(sidebarCard("AR-Q02"));

    const options = within(comboboxIn("Yes"))
      .getAllByRole("option")
      .map((option) => (option as HTMLOptionElement).value);
    expect(options).toEqual(["", "AR-Q01", "AR-E01"]);
  });

  // -- Borrado -------------------------------------------------------------

  it("deletes a step after confirmation and moves the selection", async () => {
    const user = userEvent.setup();
    renderEditor(makeValidFlow(), "edit");

    await user.click(within(sidebarCard("AR-S01")).getByTitle("Delete step"));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(sidebarOrder()).toEqual(["AR-Q01", "AR-F01", "AR-E01"]);
    expect(screen.getByRole("heading", { name: "AR-Q01" })).toBeInTheDocument();
  });

  it("keeps the step when the delete confirmation is declined", async () => {
    confirmSpy.mockReturnValue(false);
    const user = userEvent.setup();
    renderEditor(makeValidFlow(), "edit");

    await user.click(within(sidebarCard("AR-S01")).getByTitle("Delete step"));

    expect(sidebarOrder()).toEqual(["AR-S01", "AR-Q01", "AR-F01", "AR-E01"]);
  });

  it("clears the selection when the last step is deleted", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [makeEndStep()];
    renderEditor(flow, "edit");

    await user.click(screen.getByTitle("Delete step"));

    expect(
      screen.getByText("Select a step from the sidebar to edit")
    ).toBeInTheDocument();
  });

  it("keeps the selection when a different step is deleted", async () => {
    const user = userEvent.setup();
    renderEditor(makeValidFlow(), "edit");

    await user.click(within(sidebarCard("AR-E01")).getByTitle("Delete step"));

    expect(screen.getByRole("heading", { name: "AR-S01" })).toBeInTheDocument();
    expect(sidebarOrder()).toEqual(["AR-S01", "AR-Q01", "AR-F01"]);
  });

  it("leaves dangling references when the target step is deleted", async () => {
    const user = userEvent.setup();
    renderEditor(makeValidFlow(), "edit");

    // AR-Q01.yesNext apunta a AR-F01.
    await user.click(within(sidebarCard("AR-F01")).getByTitle("Delete step"));
    await user.click(screen.getByText("Is the ramp compliant?"));

    // FIXME: al borrar un paso no se limpian las referencias que lo apuntaban:
    // el selector queda vacío porque la opción ya no existe, pero el paso sigue
    // guardando yesNext="AR-F01" y se marca como incompleto sólo si queda vacío.
    expect(comboboxIn("Yes")).toHaveValue("");
    const options = within(comboboxIn("Yes"))
      .getAllByRole("option")
      .map((option) => (option as HTMLOptionElement).value);
    expect(options).not.toContain("AR-F01");
  });

  // -- Renombrado ----------------------------------------------------------

  it("renames a step and keeps it selected", async () => {
    renderEditor(makeValidFlow(), "edit");

    const idInput = textboxIn("Step ID");
    fireEvent.change(idInput, { target: { value: "AR-S99" } });

    expect(screen.getByRole("heading", { name: "AR-S99" })).toBeInTheDocument();
    expect(sidebarOrder()).toEqual(["AR-S99", "AR-Q01", "AR-F01", "AR-E01"]);
    expect(textboxIn("Step ID")).toHaveValue("AR-S99");
  });

  it("does not rewrite the references pointing to a renamed step", async () => {
    const user = userEvent.setup();
    renderEditor(makeValidFlow(), "edit");

    await user.click(screen.getByText("Record quantity"));
    fireEvent.change(textboxIn("Step ID"), { target: { value: "AR-F99" } });

    await user.click(screen.getByText("Is the ramp compliant?"));

    // FIXME: renombrar un paso rompe las referencias existentes: AR-Q01 sigue
    // con yesNext="AR-F01", que ya no existe, y el selector aparece vacío.
    expect(comboboxIn("Yes")).toHaveValue("");
    expect(
      within(comboboxIn("Yes"))
        .getAllByRole("option")
        .map((option) => (option as HTMLOptionElement).value)
    ).toContain("AR-F99");
  });

  // -- Reordenamiento ------------------------------------------------------

  it("reorders steps with drag and drop", () => {
    renderEditor(makeValidFlow(), "edit");

    dragAndDrop(sidebarCard("AR-E01"), sidebarCard("AR-S01"));

    expect(sidebarOrder()).toEqual(["AR-E01", "AR-S01", "AR-Q01", "AR-F01"]);
  });

  it("keeps the order when a step is dropped onto itself", () => {
    renderEditor(makeValidFlow(), "edit");

    dragAndDrop(sidebarCard("AR-Q01"), sidebarCard("AR-Q01"));

    expect(sidebarOrder()).toEqual(["AR-S01", "AR-Q01", "AR-F01", "AR-E01"]);
  });

  it("highlights the drop target while dragging over a different step", () => {
    renderEditor(makeValidFlow(), "edit");
    const source = sidebarCard("AR-E01");
    const target = sidebarCard("AR-S01");
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(source, { dataTransfer });
    fireEvent.dragEnter(target, { dataTransfer });
    expect(target.className).toContain("border-t-purple-500");

    // Al salir del mismo elemento se limpia el resaltado.
    fireEvent.dragLeave(target, { dataTransfer });
    expect(sidebarCard("AR-S01").className).not.toContain(
      "border-t-purple-500"
    );

    fireEvent.dragEnd(source, { dataTransfer });
  });

  it("ignores drag and drop for non administrators", () => {
    sessionMock.mockReturnValue({ isAdmin: false });
    renderEditor(makeValidFlow(), "edit");

    dragAndDrop(sidebarCard("AR-E01"), sidebarCard("AR-S01"));

    expect(sidebarOrder()).toEqual(["AR-S01", "AR-Q01", "AR-F01", "AR-E01"]);
  });

  it("does nothing when dropping without an active drag", () => {
    renderEditor(makeValidFlow(), "edit");
    const dataTransfer = createDataTransfer();

    fireEvent.drop(sidebarCard("AR-S01"), { dataTransfer });

    expect(sidebarOrder()).toEqual(["AR-S01", "AR-Q01", "AR-F01", "AR-E01"]);
  });
});
