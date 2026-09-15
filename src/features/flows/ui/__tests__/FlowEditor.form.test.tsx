// ---------------------------------------------------------------------------
// FlowEditor: campos propios del paso Form (title, next y fields con type,
// label, unit y placeholder).
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

import type { Flow, FormStep } from "@entities/flow/model";
import {
  comboboxIn,
  fieldBlocks,
  fieldRow,
  lastButtonIn,
  makeEndStep,
  makeFormStep,
  makeQuestionStep,
  makeValidFlow,
  renderEditor,
  sidebarCard,
} from "./flowEditorHarness";

function formFlow(overrides: Partial<FormStep> = {}): Flow {
  const flow = makeValidFlow();
  flow.steps = [
    makeFormStep(overrides),
    makeQuestionStep(),
    makeEndStep(),
  ];
  return flow;
}

/** Tipo, label y controles auxiliares de un field por índice. */
function fieldControls(index: number) {
  const block = fieldBlocks()[index] as HTMLElement;
  const textboxes = within(block).getAllByRole("textbox");
  return {
    block,
    type: (block.firstElementChild?.firstElementChild?.textContent ??
      "") as string,
    label: textboxes[0] as HTMLElement,
    placeholder: within(block).queryByPlaceholderText(
      "Optional placeholder..."
    ),
    unit: within(block).queryByRole("combobox"),
    remove: lastButtonIn(block),
  };
}

describe("FlowEditor - Form step", () => {
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

  it("edits the form title and reflects it in the sidebar", async () => {
    const user = userEvent.setup();
    renderEditor(formFlow({ title: "" }), "edit");

    const title = within(fieldRow("Title")).getByRole("textbox");
    await user.type(title, "Door measurements");

    expect(title).toHaveValue("Door measurements");
    expect(
      within(sidebarCard("AR-F01")).getByText("Door measurements")
    ).toBeInTheDocument();
  });

  it("edits the next step", async () => {
    const user = userEvent.setup();
    renderEditor(formFlow(), "edit");

    await user.selectOptions(comboboxIn("Next Step"), "AR-Q01");

    expect(comboboxIn("Next Step")).toHaveValue("AR-Q01");
  });

  it("adds a quantity field and disables its button afterwards", async () => {
    const user = userEvent.setup();
    renderEditor(formFlow({ fields: [] }), "edit");

    const button = screen.getByRole("button", { name: /^Quantity$/ });
    expect(button).toBeEnabled();
    await user.click(button);

    expect(fieldBlocks()).toHaveLength(1);
    const field = fieldControls(0);
    expect(field.type).toBe("number");
    expect(field.label).toHaveValue("Quantity");
    expect(field.unit).toBeNull();
    expect(screen.getByRole("button", { name: /^Quantity$/ })).toBeDisabled();
  });

  it("adds a photo field with its own type and no placeholder row", async () => {
    const user = userEvent.setup();
    renderEditor(formFlow({ fields: [] }), "edit");

    await user.click(screen.getByRole("button", { name: /^Photo$/ }));

    const field = fieldControls(0);
    expect(field.type).toBe("photo");
    expect(field.label).toHaveValue("Upload photo");
    expect(field.placeholder).toBeNull();
    expect(screen.getByRole("button", { name: /^Photo$/ })).toBeDisabled();
  });

  it("adds a notes field with its default placeholder", async () => {
    const user = userEvent.setup();
    renderEditor(formFlow({ fields: [] }), "edit");

    await user.click(screen.getByRole("button", { name: /^Notes$/ }));

    const field = fieldControls(0);
    expect(field.type).toBe("text");
    expect(field.label).toHaveValue("Notes (optional)");
    expect(field.placeholder).toHaveValue("Enter notes...");
  });

  it("adds several measurement fields with incremental ids and the inch unit", async () => {
    const user = userEvent.setup();
    renderEditor(formFlow({ fields: [] }), "edit");

    const button = screen.getByRole("button", { name: /^Measurement$/ });
    await user.click(button);
    await user.click(screen.getByRole("button", { name: /^Measurement$/ }));

    expect(fieldBlocks()).toHaveLength(2);
    expect(fieldControls(0).unit).toHaveValue('"');
    expect(fieldControls(1).unit).toHaveValue('"');
    // El botón nunca se deshabilita: se pueden agregar varias medidas.
    expect(screen.getByRole("button", { name: /^Measurement$/ })).toBeEnabled();
  });

  it("changes the unit of a measurement field", async () => {
    const user = userEvent.setup();
    renderEditor(
      formFlow({
        fields: [
          { id: "measurements_1", type: "number", label: "Width", unit: '"' },
        ],
      }),
      "edit"
    );

    const unit = fieldControls(0).unit as HTMLElement;
    await user.selectOptions(unit, "cm");
    expect(fieldControls(0).unit).toHaveValue("cm");

    await user.selectOptions(fieldControls(0).unit as HTMLElement, "%");
    expect(fieldControls(0).unit).toHaveValue("%");
  });

  it("falls back to the inch unit when the measurement field has none", () => {
    renderEditor(
      formFlow({
        fields: [{ id: "measurements_1", type: "number", label: "Width" }],
      }),
      "edit"
    );

    expect(fieldControls(0).unit).toHaveValue('"');
  });

  it("edits the label and the placeholder of a field", async () => {
    const user = userEvent.setup();
    renderEditor(
      formFlow({
        fields: [{ id: "notes", type: "text", label: "Notes (optional)" }],
      }),
      "edit"
    );

    const field = fieldControls(0);
    await user.clear(field.label);
    await user.type(field.label, "Inspector notes");
    await user.type(fieldControls(0).placeholder as HTMLElement, "Write here");

    expect(fieldControls(0).label).toHaveValue("Inspector notes");
    expect(fieldControls(0).placeholder).toHaveValue("Write here");
  });

  it("deletes a field", async () => {
    const user = userEvent.setup();
    renderEditor(
      formFlow({
        fields: [
          { id: "quantity", type: "number", label: "Quantity" },
          { id: "photo", type: "photo", label: "Upload photo" },
        ],
      }),
      "edit"
    );

    await user.click(fieldControls(0).remove);

    expect(fieldBlocks()).toHaveLength(1);
    expect(fieldControls(0).label).toHaveValue("Upload photo");
    // Al borrar el field el botón vuelve a habilitarse.
    expect(screen.getByRole("button", { name: /^Quantity$/ })).toBeEnabled();
  });

  it("explains that the shared quantity barriers are calculated on save", () => {
    renderEditor(formFlow(), "edit");

    expect(
      screen.getByText(/Barrier IDs will be calculated and saved automatically/)
    ).toBeInTheDocument();
    expect(screen.getByText("(None)")).toBeInTheDocument();
  });

  it("lists the persisted applies_to_barriers of the shared quantity metadata", () => {
    renderEditor(
      formFlow({
        metadata: {
          sharedQuantity: { appliesToBarriers: ["AR-B01", "AR-B03"] },
        },
      }),
      "edit"
    );

    expect(screen.getByText("AR-B01, AR-B03")).toBeInTheDocument();
  });

  it("shows no barriers when the metadata has no shared quantity", () => {
    renderEditor(formFlow({ metadata: {} }), "edit");

    expect(screen.getByText("(None)")).toBeInTheDocument();
  });
});
