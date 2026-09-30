// ---------------------------------------------------------------------------
// FlowEditor: navegación condicional (conditional_yes_next / conditional_no_next),
// alta de condiciones, match_any y el payload que se envía.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
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
  conditionBlocks,
  conditionSelects,
  conditionalPanel,
  conditionalRow,
  conditionalTarget,
  conditionalToggle,
  lastButtonIn,
  makeEndStep,
  makeFormStep,
  makeQuestionStep,
  makeSelectStep,
  makeValidFlow,
  renderEditor,
} from "./flowEditorHarness";

/**
 * Flow donde AR-Q01 es el tercer paso: así tiene pasos previos (AR-S01 y
 * AR-Q00) disponibles como referencia en las condiciones.
 */
function conditionalFlow(overrides: Partial<QuestionStep> = {}): Flow {
  const flow = makeValidFlow();
  flow.steps = [
    makeSelectStep({
      options: [
        { label: "Door", next: "AR-Q01", barrierId: "AR-B02" },
        { label: "Ramp", next: "AR-E01" },
      ],
    }),
    makeQuestionStep({
      id: "AR-Q00",
      text: "Is it accessible?",
      yesNext: "AR-Q01",
      noNext: "AR-E01",
      barrierId: "AR-B00",
    }),
    makeQuestionStep({ barrierId: "AR-B01", ...overrides }),
    makeFormStep(),
    makeEndStep(),
  ];
  return flow;
}

/** Selecciona AR-Q01 (el Question con pasos previos). */
async function selectTargetQuestion(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText("Is the ramp compliant?"));
}

/** Guarda y devuelve el flow enviado al repositorio. */
async function saveAndGetFlow(user: ReturnType<typeof userEvent.setup>) {
  repoMock.update.mockResolvedValue(undefined);
  await user.click(screen.getByRole("button", { name: /save flow/i }));
  await waitFor(() => expect(repoMock.update).toHaveBeenCalledTimes(1));
  return repoMock.update.mock.calls[0]?.[1] as Flow;
}

describe("FlowEditor - conditional navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock.mockReturnValue({ isAdmin: true });
    localStorage.clear();
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal("alert", vi.fn());
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("starts collapsed and disabled when the step has no conditional navigation", async () => {
    const user = userEvent.setup();
    renderEditor(conditionalFlow(), "edit");
    await selectTargetQuestion(user);

    expect(conditionalToggle("YES")).not.toBeChecked();
    expect(conditionalToggle("NO")).not.toBeChecked();
    expect(conditionalPanel("YES")).toBeNull();
    expect(conditionalPanel("NO")).toBeNull();
  });

  it("expands the panel when the conditional navigation is enabled", async () => {
    const user = userEvent.setup();
    renderEditor(conditionalFlow(), "edit");
    await selectTargetQuestion(user);

    await user.click(conditionalToggle("YES"));

    expect(conditionalToggle("YES")).toBeChecked();
    expect(
      within(conditionalRow("YES")).getByText(
        "Alternate navigation when YES is answered AND conditions are met"
      )
    ).toBeInTheDocument();
    expect(conditionalTarget("YES")).toHaveValue("");
    expect(conditionBlocks("YES")).toHaveLength(0);
    expect(
      within(conditionalRow("YES")).getByText("0 condition(s)")
    ).toBeInTheDocument();
  });

  it("keeps both branches independent", async () => {
    const user = userEvent.setup();
    renderEditor(conditionalFlow(), "edit");
    await selectTargetQuestion(user);

    await user.click(conditionalToggle("NO"));

    expect(conditionalPanel("NO")).not.toBeNull();
    expect(conditionalPanel("YES")).toBeNull();
    expect(
      within(conditionalRow("NO")).getByText(
        "Alternate navigation when NO is answered AND conditions are met"
      )
    ).toBeInTheDocument();
  });

  it("disabling the conditional navigation removes it from the payload", async () => {
    const user = userEvent.setup();
    renderEditor(
      conditionalFlow({
        conditionalYesNext: {
          conditions: [{ step_id: "AR-Q00", answer: "YES" }],
          next: "AR-F01",
          match_any: false,
        },
      }),
      "edit"
    );
    await selectTargetQuestion(user);

    expect(conditionalToggle("YES")).toBeChecked();
    await user.click(conditionalToggle("YES"));

    expect(conditionalPanel("YES")).toBeNull();
    const saved = await saveAndGetFlow(user);
    const question = saved.steps[2] as QuestionStep;
    expect(question.conditionalYesNext).toBeUndefined();
  });

  it("adds a condition on a previous Question step using answer", async () => {
    const user = userEvent.setup();
    renderEditor(conditionalFlow(), "edit");
    await selectTargetQuestion(user);
    await user.click(conditionalToggle("YES"));

    await user.selectOptions(conditionalTarget("YES"), "AR-F01");
    await user.click(
      within(conditionalRow("YES")).getByRole("button", {
        name: /add condition/i,
      })
    );

    expect(conditionBlocks("YES")).toHaveLength(1);
    // Sólo hay un select mientras el paso de la condición no esté elegido.
    expect(conditionSelects("YES", 0)).toHaveLength(1);

    await user.selectOptions(conditionSelects("YES", 0)[0] as HTMLElement, "AR-Q00");
    const [, answerSelect] = conditionSelects("YES", 0);
    await user.selectOptions(answerSelect as HTMLElement, "NO");

    const saved = await saveAndGetFlow(user);
    const question = saved.steps[2] as QuestionStep;
    expect(question.conditionalYesNext).toEqual({
      conditions: [{ step_id: "AR-Q00", answer: "NO" }],
      next: "AR-F01",
      match_any: false,
    });
  });

  it("adds a condition on a previous Select step using selected_option", async () => {
    const user = userEvent.setup();
    renderEditor(conditionalFlow(), "edit");
    await selectTargetQuestion(user);
    await user.click(conditionalToggle("YES"));

    await user.selectOptions(conditionalTarget("YES"), "AR-F01");
    await user.click(
      within(conditionalRow("YES")).getByRole("button", {
        name: /add condition/i,
      })
    );
    await user.selectOptions(conditionSelects("YES", 0)[0] as HTMLElement, "AR-S01");

    // El segundo select ofrece los labels de las opciones del Select.
    const [, optionSelect] = conditionSelects("YES", 0);
    expect(
      within(optionSelect as HTMLElement)
        .getAllByRole("option")
        .map((option) => (option as HTMLOptionElement).value)
    ).toEqual(["", "Door", "Ramp"]);

    await user.selectOptions(optionSelect as HTMLElement, "Door");

    const saved = await saveAndGetFlow(user);
    const question = saved.steps[2] as QuestionStep;
    // La condición sobre un Select se declara con `selected_option`, no `answer`.
    expect(question.conditionalYesNext).toEqual({
      conditions: [{ step_id: "AR-S01", selected_option: "Door" }],
      next: "AR-F01",
      match_any: false,
    });
  });

  it("only offers the steps placed before the current one as condition sources", async () => {
    const user = userEvent.setup();
    renderEditor(conditionalFlow(), "edit");
    await selectTargetQuestion(user);
    await user.click(conditionalToggle("YES"));
    await user.click(
      within(conditionalRow("YES")).getByRole("button", {
        name: /add condition/i,
      })
    );

    const values = within(conditionSelects("YES", 0)[0] as HTMLElement)
      .getAllByRole("option")
      .map((option) => (option as HTMLOptionElement).value);

    expect(values).toEqual(["", "AR-S01", "AR-Q00"]);
  });

  it("offers every step, including the current one, as conditional target", async () => {
    const user = userEvent.setup();
    renderEditor(conditionalFlow(), "edit");
    await selectTargetQuestion(user);
    await user.click(conditionalToggle("YES"));

    const values = within(conditionalTarget("YES"))
      .getAllByRole("option")
      .map((option) => (option as HTMLOptionElement).value);

    expect(values).toEqual([
      "",
      "AR-S01",
      "AR-Q00",
      "AR-Q01",
      "AR-F01",
      "AR-E01",
    ]);
  });

  it("saves match_any as true when the OR logic is checked", async () => {
    const user = userEvent.setup();
    renderEditor(conditionalFlow(), "edit");
    await selectTargetQuestion(user);
    await user.click(conditionalToggle("YES"));
    await user.selectOptions(conditionalTarget("YES"), "AR-F01");

    const matchAny = within(conditionalRow("YES")).getByLabelText(
      /Match ANY condition/
    );
    expect(matchAny).not.toBeChecked();
    await user.click(matchAny);

    expect(
      within(conditionalRow("YES")).getByLabelText(/Match ANY condition/)
    ).toBeChecked();
    const saved = await saveAndGetFlow(user);
    const question = saved.steps[2] as QuestionStep;
    expect(question.conditionalYesNext?.match_any).toBe(true);
  });

  it("saves match_any back to false when the OR logic is unchecked", async () => {
    const user = userEvent.setup();
    renderEditor(
      conditionalFlow({
        conditionalNoNext: {
          conditions: [{ step_id: "AR-Q00", answer: "YES" }],
          next: "AR-F01",
          match_any: true,
        },
      }),
      "edit"
    );
    await selectTargetQuestion(user);

    const matchAny = within(conditionalRow("NO")).getByLabelText(
      /Match ANY condition/
    );
    expect(matchAny).toBeChecked();
    await user.click(matchAny);

    const saved = await saveAndGetFlow(user);
    const question = saved.steps[2] as QuestionStep;
    expect(question.conditionalNoNext?.match_any).toBe(false);
  });

  it("supports several conditions and deletes the chosen one", async () => {
    const user = userEvent.setup();
    renderEditor(
      conditionalFlow({
        conditionalYesNext: {
          conditions: [
            { step_id: "AR-S01", selected_option: "Door" },
            { step_id: "AR-Q00", answer: "YES" },
          ],
          next: "AR-F01",
          match_any: true,
        },
      }),
      "edit"
    );
    await selectTargetQuestion(user);

    expect(conditionBlocks("YES")).toHaveLength(2);
    expect(
      within(conditionalRow("YES")).getByText("2 condition(s)")
    ).toBeInTheDocument();

    await user.click(lastButtonIn(conditionBlocks("YES")[0] as HTMLElement));

    expect(conditionBlocks("YES")).toHaveLength(1);
    const saved = await saveAndGetFlow(user);
    const question = saved.steps[2] as QuestionStep;
    expect(question.conditionalYesNext?.conditions).toEqual([
      { step_id: "AR-Q00", answer: "YES" },
    ]);
  });

  it("renders an existing conditional navigation already expanded", async () => {
    const user = userEvent.setup();
    renderEditor(
      conditionalFlow({
        conditionalYesNext: {
          conditions: [{ step_id: "AR-Q00", answer: "YES" }],
          next: "AR-F01",
        },
      }),
      "edit"
    );
    await selectTargetQuestion(user);

    expect(conditionalPanel("YES")).not.toBeNull();
    expect(conditionalTarget("YES")).toHaveValue("AR-F01");
    const [stepSelect, answerSelect] = conditionSelects("YES", 0);
    expect(stepSelect).toHaveValue("AR-Q00");
    expect(answerSelect).toHaveValue("YES");
  });

  it("keeps the stale answer when the condition source changes to a Select", async () => {
    const user = userEvent.setup();
    renderEditor(
      conditionalFlow({
        conditionalYesNext: {
          conditions: [{ step_id: "AR-Q00", answer: "YES" }],
          next: "AR-F01",
        },
      }),
      "edit"
    );
    await selectTargetQuestion(user);

    await user.selectOptions(conditionSelects("YES", 0)[0] as HTMLElement, "AR-S01");
    await user.selectOptions(conditionSelects("YES", 0)[1] as HTMLElement, "Ramp");

    const saved = await saveAndGetFlow(user);
    const question = saved.steps[2] as QuestionStep;
    // FIXME: `handleUpdateCondition` mergea updates, así que cambiar el paso de
    // la condición no limpia el `answer` anterior (el comentario del código dice
    // lo contrario) y el payload viaja con `answer` y `selected_option` juntos.
    expect(question.conditionalYesNext?.conditions[0]).toEqual({
      step_id: "AR-S01",
      answer: "YES",
      selected_option: "Ramp",
    });
  });

  it("re-expands the collapsed panel after any other edit", async () => {
    const user = userEvent.setup();
    renderEditor(
      conditionalFlow({
        conditionalYesNext: {
          conditions: [{ step_id: "AR-Q00", answer: "YES" }],
          next: "AR-F01",
        },
      }),
      "edit"
    );
    await selectTargetQuestion(user);

    await user.click(
      within(conditionalRow("YES")).getByRole("button", {
        name: /Conditional YES Navigation/,
      })
    );
    expect(conditionalPanel("YES")).toBeNull();

    // FIXME: ConditionalNavEditor se declara dentro del render de FlowEditor,
    // así que cada cambio de estado lo remonta y pierde `isExpanded`: el panel
    // colapsado se vuelve a abrir solo al editar cualquier otro campo.
    await user.type(
      screen.getByPlaceholderText("Enter question text"),
      "?"
    );
    expect(conditionalPanel("YES")).not.toBeNull();
  });

  it("adds a condition to a step that has no previous steps", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [makeQuestionStep(), makeFormStep(), makeEndStep()];
    renderEditor(flow, "edit");

    await user.click(conditionalToggle("YES"));
    await user.click(
      within(conditionalRow("YES")).getByRole("button", {
        name: /add condition/i,
      })
    );

    // Sin pasos previos el select sólo tiene el placeholder.
    const values = within(conditionSelects("YES", 0)[0] as HTMLElement)
      .getAllByRole("option")
      .map((option) => (option as HTMLOptionElement).value);
    expect(values).toEqual([""]);
  });
});
