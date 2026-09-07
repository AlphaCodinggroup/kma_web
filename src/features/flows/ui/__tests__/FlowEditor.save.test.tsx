// ---------------------------------------------------------------------------
// FlowEditor: validación previa al guardado, payload enviado al repositorio,
// cálculo automático de metadata.shared_quantity y estados de guardado/error.
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

import type { Flow, FormStep } from "@entities/flow/model";
import {
  makeEndStep,
  makeFormStep,
  makeNewFlow,
  makeQuestionStep,
  makeSelectStep,
  makeValidFlow,
  renderEditor,
} from "./flowEditorHarness";

function clickSave(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getByRole("button", { name: /save flow/i }));
}

describe("FlowEditor - validation and save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock.mockReturnValue({ isAdmin: true });
    localStorage.clear();
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal("alert", vi.fn());
    vi.spyOn(console, "error").mockImplementation(() => {});
    repoMock.update.mockResolvedValue(undefined);
    repoMock.create.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // -- Validación ----------------------------------------------------------

  it("rejects an empty flow listing the missing title and steps", async () => {
    const user = userEvent.setup();
    renderEditor(makeNewFlow(), "create");

    await clickSave(user);

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Validation Error" })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Flow Title is required.")
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Flow must have at least one step.")
    ).toBeInTheDocument();
    expect(repoMock.create).not.toHaveBeenCalled();
    expect(repoMock.update).not.toHaveBeenCalled();
  });

  it("rejects a Question step without text and without both targets", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [makeQuestionStep({ text: "  ", yesNext: "", noNext: "" })];
    renderEditor(flow, "edit");

    await clickSave(user);

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("Step AR-Q01: Question text is required.")
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Step AR-Q01: 'Yes Next' step is required.")
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Step AR-Q01: 'No Next' step is required.")
    ).toBeInTheDocument();
  });

  it("rejects a Form step without title, target and fields", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [makeFormStep({ title: "", next: "", fields: [] })];
    renderEditor(flow, "edit");

    await clickSave(user);

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("Step AR-F01: Form title is required.")
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Step AR-F01: 'Next Step' is required.")
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Step AR-F01: At least one field is required.")
    ).toBeInTheDocument();
  });

  it("rejects a Select step without title and without options", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [
      makeSelectStep({ title: "", text: "", options: [] }),
    ];
    renderEditor(flow, "edit");

    await clickSave(user);

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("Step AR-S01: Title/Text is required.")
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Step AR-S01: At least one option is required.")
    ).toBeInTheDocument();
  });

  it("rejects a Select option without target naming its position", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [
      makeSelectStep({
        options: [
          { label: "Door", next: "AR-E01" },
          { label: "Ramp", next: "" },
        ],
      }),
      makeEndStep(),
    ];
    renderEditor(flow, "edit");

    await clickSave(user);

    expect(
      screen.getByText("Step AR-S01 (Option 2): 'Next Step' is required.")
    ).toBeInTheDocument();
  });

  it("accepts a Select step that only has text", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [
      makeSelectStep({
        title: "",
        text: "Only text",
        options: [{ label: "Door", next: "AR-E01" }],
      }),
      makeEndStep(),
    ];
    renderEditor(flow, "edit");

    await clickSave(user);

    await waitFor(() => expect(repoMock.update).toHaveBeenCalledTimes(1));
  });

  it("closes the validation modal without navigating", async () => {
    const user = userEvent.setup();
    renderEditor(makeNewFlow(), "create");

    await clickSave(user);
    await user.click(screen.getByRole("button", { name: "Fix Errors" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  // -- Payload -------------------------------------------------------------

  it("updates an existing flow with the exact domain payload", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [makeQuestionStep({ yesNext: "AR-E01" }), makeEndStep()];
    renderEditor(flow, "edit");

    await clickSave(user);

    await waitFor(() => expect(repoMock.update).toHaveBeenCalledTimes(1));
    expect(repoMock.update).toHaveBeenCalledWith("AR", {
      id: "AR",
      title: "Ramps",
      description: "Ramp audit flow",
      flowType: "Ramps",
      version: 3,
      isActive: true,
      steps: [
        {
          id: "AR-Q01",
          type: "Question",
          text: "Is the ramp compliant?",
          yesNext: "AR-E01",
          noNext: "AR-E01",
          image: null,
          images: [],
        },
        { id: "AR-E01", type: "End", image: null, images: [] },
      ],
    });
    expect(repoMock.create).not.toHaveBeenCalled();
  });

  it("sends the edits made in the editor", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [makeQuestionStep({ yesNext: "AR-E01" }), makeEndStep()];
    renderEditor(flow, "edit");

    await user.type(screen.getByPlaceholderText("Untitled Flow"), " 2026");
    await user.type(
      screen.getByPlaceholderText("Add a description (optional)..."),
      "!"
    );
    await clickSave(user);

    await waitFor(() => expect(repoMock.update).toHaveBeenCalledTimes(1));
    const sent = repoMock.update.mock.calls[0]?.[1] as Flow;
    expect(sent.title).toBe("Ramps 2026");
    expect(sent.description).toBe("Ramp audit flow!");
  });

  it("creates the flow when the initial id is new", async () => {
    const user = userEvent.setup();
    const flow = makeNewFlow();
    flow.title = "Brand new";
    flow.steps = [makeEndStep()];
    const { invalidateQueries } = renderEditor(flow, "create");

    await clickSave(user);

    await waitFor(() => expect(repoMock.create).toHaveBeenCalledTimes(1));
    expect(repoMock.create).toHaveBeenCalledWith({
      id: "new",
      title: "Brand new",
      description: "",
      version: 1,
      steps: [{ id: "AR-E01", type: "End", image: null, images: [] }],
    });
    expect(repoMock.update).not.toHaveBeenCalled();
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["flows", "list"],
    });
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it("invalidates the detail and the list queries after an update", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [makeEndStep()];
    const { invalidateQueries } = renderEditor(flow, "edit");

    await clickSave(user);

    await waitFor(() => expect(repoMock.update).toHaveBeenCalledTimes(1));
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["flows", "detail", "AR"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["flows", "list"],
    });
  });

  // -- metadata.shared_quantity -------------------------------------------

  it("derives applies_to_barriers from the conditional navigation sources", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [
      makeSelectStep({
        options: [
          { label: "Door", next: "AR-Q01", barrierId: "AR-B02" },
          { label: "Ramp", next: "AR-E01" },
        ],
      }),
      makeQuestionStep({
        barrierId: "AR-B01",
        conditionalYesNext: {
          conditions: [{ step_id: "AR-S01", selected_option: "Door" }],
          next: "AR-F01",
          match_any: false,
        },
      }),
      makeFormStep(),
      makeEndStep(),
    ];
    renderEditor(flow, "edit");

    await clickSave(user);

    await waitFor(() => expect(repoMock.update).toHaveBeenCalledTimes(1));
    const sent = repoMock.update.mock.calls[0]?.[1] as Flow;
    const form = sent.steps[2] as FormStep;
    // El barrier del Question origen y el de la opción referida, ordenados.
    expect(form.metadata?.sharedQuantity?.appliesToBarriers).toEqual([
      "AR-B01",
      "AR-B02",
    ]);
  });

  it("derives applies_to_barriers from a condition on another Question", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [
      makeQuestionStep({
        id: "AR-Q00",
        text: "Is it accessible?",
        yesNext: "AR-Q01",
        noNext: "AR-E01",
        barrierId: "AR-B00",
      }),
      makeQuestionStep({
        conditionalNoNext: {
          conditions: [{ step_id: "AR-Q00", answer: "YES" }],
          next: "AR-F01",
        },
      }),
      makeFormStep(),
      makeEndStep(),
    ];
    renderEditor(flow, "edit");

    await clickSave(user);

    await waitFor(() => expect(repoMock.update).toHaveBeenCalledTimes(1));
    const sent = repoMock.update.mock.calls[0]?.[1] as Flow;
    const form = sent.steps[2] as FormStep;
    expect(form.metadata?.sharedQuantity?.appliesToBarriers).toEqual([
      "AR-B00",
    ]);
  });

  it("ignores conditions pointing to steps that no longer exist", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [
      makeQuestionStep({
        barrierId: "AR-B01",
        conditionalYesNext: {
          conditions: [{ step_id: "AR-GONE", answer: "YES" }],
          next: "AR-F01",
        },
      }),
      makeFormStep(),
      makeEndStep(),
    ];
    renderEditor(flow, "edit");

    await clickSave(user);

    await waitFor(() => expect(repoMock.update).toHaveBeenCalledTimes(1));
    const sent = repoMock.update.mock.calls[0]?.[1] as Flow;
    const form = sent.steps[1] as FormStep;
    expect(form.metadata?.sharedQuantity?.appliesToBarriers).toEqual([
      "AR-B01",
    ]);
  });

  it("clears a stale shared quantity when no conditional navigation points to the form", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [
      makeQuestionStep(),
      makeFormStep({
        metadata: {
          sharedQuantity: { appliesToBarriers: ["AR-B01", "AR-B02"] },
        },
      }),
      makeEndStep(),
    ];
    renderEditor(flow, "edit");

    await clickSave(user);

    await waitFor(() => expect(repoMock.update).toHaveBeenCalledTimes(1));
    const sent = repoMock.update.mock.calls[0]?.[1] as Flow;
    const form = sent.steps[1] as FormStep;
    expect(form.metadata).toEqual({});
    expect(form.metadata?.sharedQuantity).toBeUndefined();
  });

  it("keeps the form metadata empty when the conditional target is another step", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [
      makeQuestionStep({
        barrierId: "AR-B01",
        conditionalYesNext: {
          conditions: [],
          next: "AR-E01",
        },
      }),
      makeFormStep(),
      makeEndStep(),
    ];
    renderEditor(flow, "edit");

    await clickSave(user);

    await waitFor(() => expect(repoMock.update).toHaveBeenCalledTimes(1));
    const sent = repoMock.update.mock.calls[0]?.[1] as Flow;
    const form = sent.steps[1] as FormStep;
    expect(form.metadata).toEqual({});
  });

  it("skips the barrier of a source Question that has none", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [
      makeQuestionStep({
        conditionalYesNext: { conditions: [], next: "AR-F01" },
      }),
      makeFormStep(),
      makeEndStep(),
    ];
    renderEditor(flow, "edit");

    await clickSave(user);

    await waitFor(() => expect(repoMock.update).toHaveBeenCalledTimes(1));
    const sent = repoMock.update.mock.calls[0]?.[1] as Flow;
    const form = sent.steps[1] as FormStep;
    expect(form.metadata).toEqual({});
  });

  // -- Estados de guardado -------------------------------------------------

  it("shows the saving state while the request is in flight", async () => {
    const user = userEvent.setup();
    let resolveUpdate: (() => void) | undefined;
    repoMock.update.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdate = () => resolve();
        })
    );
    const flow = makeValidFlow();
    flow.steps = [makeEndStep()];
    renderEditor(flow, "edit");

    await clickSave(user);

    // El editor se reemplaza por el indicador de carga a pantalla completa.
    expect(screen.getByText("Saving...")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Untitled Flow")
    ).not.toBeInTheDocument();

    resolveUpdate?.();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Flow Saved" })).toBeInTheDocument()
    );
  });

  it("confirms the save, clears the dirty flag and navigates back to the list", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [makeEndStep()];
    renderEditor(flow, "edit");

    await user.type(screen.getByPlaceholderText("Untitled Flow"), " v2");
    await clickSave(user);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Flow Saved" })).toBeInTheDocument()
    );
    expect(
      screen.getByText("The flow has been successfully saved.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(pushMock).toHaveBeenCalledWith("/flows");
  });

  it("clears the persisted draft after a successful save", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [makeEndStep()];
    // Borrador idéntico al flow inicial: no dispara el modal de recuperación.
    localStorage.setItem(
      "flow-editor-draft-AR",
      JSON.stringify({ flow, savedAt: "2026-01-01T00:00:00.000Z" })
    );
    renderEditor(flow, "edit");

    await clickSave(user);

    await waitFor(() =>
      expect(localStorage.getItem("flow-editor-draft-AR")).toBeNull()
    );
  });

  it("reports an unexpected failure and keeps the editor usable", async () => {
    const user = userEvent.setup();
    repoMock.update.mockRejectedValue(new Error("network down"));
    const flow = makeValidFlow();
    flow.steps = [makeEndStep()];
    renderEditor(flow, "edit");

    await clickSave(user);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Save Failed" })).toBeInTheDocument()
    );
    expect(
      screen.getByText(
        "An unexpected error occurred while saving. Please try again."
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fix Errors" }));

    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText("Untitled Flow")).toHaveValue("Ramps");
  });

  it("closes the success modal through the overlay and still navigates", async () => {
    const user = userEvent.setup();
    const flow = makeValidFlow();
    flow.steps = [makeEndStep()];
    const { container } = renderEditor(flow, "edit");

    await clickSave(user);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Flow Saved" })).toBeInTheDocument()
    );

    const overlay = container.querySelector("div.bg-black\\/40");
    await user.click(overlay as HTMLElement);

    expect(pushMock).toHaveBeenCalledWith("/flows");
  });
});
