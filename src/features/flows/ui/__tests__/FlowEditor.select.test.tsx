// ---------------------------------------------------------------------------
// FlowEditor: campos propios del paso Select (title/text y opciones con
// label, next y barrier_id).
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

import type { Flow, SelectStep } from "@entities/flow/model";
import {
  fieldRow,
  lastButtonIn,
  makeEndStep,
  makeQuestionStep,
  makeSelectStep,
  makeValidFlow,
  optionBlocks,
  renderEditor,
  sidebarCard,
} from "./flowEditorHarness";

function selectFlow(overrides: Partial<SelectStep> = {}): Flow {
  const flow = makeValidFlow();
  flow.steps = [
    makeSelectStep(overrides),
    makeQuestionStep(),
    makeEndStep(),
  ];
  return flow;
}

/** Controles de una opción por índice. */
function optionControls(index: number) {
  const block = optionBlocks()[index] as HTMLElement;
  const textboxes = within(block).getAllByRole("textbox");
  return {
    block,
    label: textboxes[0] as HTMLElement,
    next: within(block).getByRole("combobox"),
    barrier: within(block).getByPlaceholderText(
      "Optional Barrier ID"
    ) as HTMLElement,
    remove: lastButtonIn(block),
  };
}

describe("FlowEditor - Select step", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock.mockReturnValue({ isAdmin: true });
    localStorage.clear();
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal("alert", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes both title and text from the single title/text control", async () => {
    const user = userEvent.setup();
    renderEditor(selectFlow({ title: "", text: "" }), "edit");

    const control = within(fieldRow("Title / Text")).getByRole("textbox");
    await user.type(control, "Pick one");

    expect(control).toHaveValue("Pick one");
    // El sidebar usa `title || text`, así que refleja el mismo valor.
    expect(
      within(sidebarCard("AR-S01")).getByText("Pick one")
    ).toBeInTheDocument();
  });

  it("renders the existing options with label, next and barrier id", () => {
    renderEditor(
      selectFlow({
        options: [
          { label: "Door", next: "AR-Q01", barrierId: "AR-B02" },
          { label: "Ramp", next: "AR-E01" },
        ],
      }),
      "edit"
    );

    expect(optionBlocks()).toHaveLength(2);

    const first = optionControls(0);
    expect(first.label).toHaveValue("Door");
    expect(first.next).toHaveValue("AR-Q01");
    expect(first.barrier).toHaveValue("AR-B02");

    const second = optionControls(1);
    expect(second.label).toHaveValue("Ramp");
    expect(second.next).toHaveValue("AR-E01");
    // Sin barrier_id el input queda vacío, no con "undefined".
    expect(second.barrier).toHaveValue("");
  });

  it("adds a new option with the default label and no target", async () => {
    const user = userEvent.setup();
    renderEditor(selectFlow(), "edit");

    await user.click(screen.getByRole("button", { name: /add option/i }));

    expect(optionBlocks()).toHaveLength(2);
    const added = optionControls(1);
    expect(added.label).toHaveValue("New Option");
    expect(added.next).toHaveValue("");
    expect(
      within(sidebarCard("AR-S01")).getByTitle(
        "Incomplete: missing step references"
      )
    ).toBeInTheDocument();
  });

  it("edits the label of an option", async () => {
    const user = userEvent.setup();
    renderEditor(selectFlow(), "edit");

    const { label } = optionControls(0);
    await user.clear(label);
    await user.type(label, "Wide door");

    expect(optionControls(0).label).toHaveValue("Wide door");
  });

  it("edits the target of an option", async () => {
    const user = userEvent.setup();
    renderEditor(selectFlow(), "edit");

    await user.selectOptions(optionControls(0).next, "AR-E01");

    expect(optionControls(0).next).toHaveValue("AR-E01");
  });

  it("edits the barrier id of an option", async () => {
    const user = userEvent.setup();
    renderEditor(
      selectFlow({ options: [{ label: "Door", next: "AR-Q01" }] }),
      "edit"
    );

    await user.type(optionControls(0).barrier, "AR-B05");

    expect(optionControls(0).barrier).toHaveValue("AR-B05");
  });

  it("deletes an option keeping the rest in order", async () => {
    const user = userEvent.setup();
    renderEditor(
      selectFlow({
        options: [
          { label: "Door", next: "AR-Q01" },
          { label: "Ramp", next: "AR-E01" },
          { label: "Stairs", next: "AR-E01" },
        ],
      }),
      "edit"
    );

    await user.click(optionControls(1).remove);

    expect(optionBlocks()).toHaveLength(2);
    expect(optionControls(0).label).toHaveValue("Door");
    expect(optionControls(1).label).toHaveValue("Stairs");
  });

  it("hides the Select itself from the option targets", () => {
    renderEditor(selectFlow(), "edit");

    const values = within(optionControls(0).next)
      .getAllByRole("option")
      .map((option) => (option as HTMLOptionElement).value);

    expect(values).toEqual(["", "AR-Q01", "AR-E01"]);
  });

  it("renders no option blocks when the Select has none", () => {
    renderEditor(selectFlow({ options: [] }), "edit");

    expect(optionBlocks()).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: /add option/i })
    ).toBeInTheDocument();
  });
});
