// ---------------------------------------------------------------------------
// FlowEditor: campos propios del paso Question (texto, yesNext/noNext, barrierId).
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

import type { Flow, QuestionStep } from "@entities/flow/model";
import {
  comboboxIn,
  makeEndStep,
  makeFormStep,
  makeQuestionStep,
  makeValidFlow,
  renderEditor,
  sidebarCard,
} from "./flowEditorHarness";

/** Flow centrado en un Question, con destinos disponibles para los links. */
function questionFlow(overrides: Partial<QuestionStep> = {}): Flow {
  const flow = makeValidFlow();
  flow.steps = [
    makeQuestionStep(overrides),
    makeFormStep(),
    makeEndStep(),
    makeEndStep({ id: "AR-E02" }),
  ];
  return flow;
}

describe("FlowEditor - Question step", () => {
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

  it("edits the question text and reflects it in the sidebar", async () => {
    const user = userEvent.setup();
    renderEditor(questionFlow({ text: "" }), "edit");

    const textarea = screen.getByPlaceholderText("Enter question text");
    await user.type(textarea, "Is the door heavy?");

    expect(textarea).toHaveValue("Is the door heavy?");
    expect(
      within(sidebarCard("AR-Q01")).getByText("Is the door heavy?")
    ).toBeInTheDocument();
  });

  it("changes the yes_next target", async () => {
    const user = userEvent.setup();
    renderEditor(questionFlow(), "edit");

    await user.selectOptions(comboboxIn("Yes"), "AR-E02");

    expect(comboboxIn("Yes")).toHaveValue("AR-E02");
    expect(comboboxIn("No")).toHaveValue("AR-E01");
  });

  it("changes the no_next target", async () => {
    const user = userEvent.setup();
    renderEditor(questionFlow(), "edit");

    await user.selectOptions(comboboxIn("No"), "AR-E02");

    expect(comboboxIn("No")).toHaveValue("AR-E02");
    expect(comboboxIn("Yes")).toHaveValue("AR-F01");
  });

  it("clears a target back to the empty placeholder and marks the step incomplete", async () => {
    const user = userEvent.setup();
    renderEditor(questionFlow(), "edit");

    await user.selectOptions(comboboxIn("Yes"), "");

    expect(comboboxIn("Yes")).toHaveValue("");
    expect(
      within(sidebarCard("AR-Q01")).getByTitle(
        "Incomplete: missing step references"
      )
    ).toBeInTheDocument();
  });

  it("edits the barrier id", async () => {
    const user = userEvent.setup();
    renderEditor(questionFlow(), "edit");

    const barrier = screen.getByPlaceholderText("e.g. AR-B01");
    await user.type(barrier, "AR-B07");

    expect(barrier).toHaveValue("AR-B07");
  });

  it("renders the existing barrier id", () => {
    renderEditor(questionFlow({ barrierId: "AR-B99" }), "edit");

    expect(screen.getByPlaceholderText("e.g. AR-B01")).toHaveValue("AR-B99");
  });

  it("offers every other step (and itself excluded) as a target", () => {
    renderEditor(questionFlow(), "edit");

    const values = within(comboboxIn("Yes"))
      .getAllByRole("option")
      .map((option) => (option as HTMLOptionElement).value);

    expect(values).toEqual(["", "AR-F01", "AR-E01", "AR-E02"]);
    expect(values).not.toContain("AR-Q01");
  });

  it("shows the placeholder label of the step selector", () => {
    renderEditor(questionFlow({ yesNext: "" }), "edit");

    expect(
      within(comboboxIn("Yes")).getByRole("option", {
        name: "Select next step...",
      })
    ).toBeInTheDocument();
  });
});
