/**
 * Tarjeta de pregunta del flujo de reporte: cada tipo de pregunta, las
 * respuestas yes/no/unsure, el formulario dinámico del camino NO (donde el 0 es
 * una medición válida y no ausencia de dato), la subida de fotos y el estado
 * deshabilitado mientras la mutación está en vuelo.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---- mocks ----

const updateAnswerMock = vi.fn();
// Estado mutable para poder simular `isPending` sin volver a mockear el módulo.
const mutationState = { isPending: false };

vi.mock("@features/audits/lib/hooks/useUpdateAuditAnswerMutation", () => ({
  useUpdateAuditAnswerMutation: () => ({
    mutateAsync: updateAnswerMock,
    isPending: mutationState.isPending,
  }),
}));

const postMock = vi.fn();
vi.mock("@shared/api/http.client", () => ({
  httpClient: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));

const uploadFileMock = vi.fn();
vi.mock("@features/flows/api/flows.repo.impl", () => ({
  flowsRepo: {
    uploadFile: (...args: unknown[]) => uploadFileMock(...args),
  },
}));

// ---- import after mocks ----
import AuditQuestionCard, {
  type AttachmentVM,
  type QuestionType,
} from "../AuditQuestionCard";

const NUMBER_FIELD = {
  id: "measurements",
  type: "number" as const,
  label: "Measurements",
  unit: "in",
  placeholder: "e.g. 34",
};

const TEXT_FIELD = {
  id: "notes",
  type: "text" as const,
  label: "Notes",
  placeholder: "Describe the barrier",
};

const PHOTO_FIELD = {
  id: "photo",
  type: "photo" as const,
  label: "Photos",
};

const BUTTON_FIELD = {
  id: "submit",
  type: "button" as const,
  label: "Submit",
};

/** Flujo mínimo: pregunta q1 cuyo camino NO lleva al formulario f1. */
const stepsWithForm = [
  { id: "q1", type: "Question", no_next: "f1" },
  { id: "f1", type: "Form", fields: [NUMBER_FIELD, TEXT_FIELD] },
];

let alertMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mutationState.isPending = false;
  updateAnswerMock.mockResolvedValue({
    audit_id: "a1",
    status: "ok",
    message: "done",
  });
  alertMock = vi.fn();
  vi.stubGlobal("alert", alertMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AuditQuestionCard — answered YES", () => {
  it("renders the hero heading with the YES pill and the auditor notes", () => {
    render(
      <AuditQuestionCard
        text="Is the ramp compliant?"
        type="yes_no"
        answeredYes={true}
        notes="Measured twice"
      />
    );

    expect(
      screen.getByRole("heading", {
        name: "Is the ramp compliant?",
        level: 4,
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("Auditor Notes")).toBeInTheDocument();
    expect(screen.getByText("Measured twice")).toBeInTheDocument();
  });

  it("omits the notes block when the notes are blank", () => {
    render(
      <AuditQuestionCard
        text="Is the ramp compliant?"
        type="yes_no"
        answeredYes={true}
        notes="   "
      />
    );

    expect(screen.queryByText("Auditor Notes")).not.toBeInTheDocument();
  });

  it("omits the notes block when the notes are null", () => {
    render(
      <AuditQuestionCard
        text="Is the ramp compliant?"
        type="yes_no"
        answeredYes={true}
        notes={null}
      />
    );

    expect(screen.queryByText("Auditor Notes")).not.toBeInTheDocument();
  });

  it("does not render attachments on the YES branch", () => {
    render(
      <AuditQuestionCard
        text="Is the ramp compliant?"
        type="yes_no"
        answeredYes={true}
        attachments={[{ id: "att-1", name: "photo.png" }]}
      />
    );

    expect(screen.queryByText("Attachments")).not.toBeInTheDocument();
  });

  it("merges the extra class name into the card", () => {
    const { container } = render(
      <AuditQuestionCard
        text="Is the ramp compliant?"
        type="yes_no"
        answeredYes={true}
        className="custom-card"
      />
    );

    expect(container.querySelector("article")?.className).toContain(
      "custom-card"
    );
  });
});

describe("AuditQuestionCard — answered NO", () => {
  it("renders the NO pill and the attachments list", () => {
    render(
      <AuditQuestionCard
        text="Is the door width compliant?"
        type="yes_no"
        answeredYes={false}
        attachments={[
          { id: "att-1", name: "door.png", mime: "image/png" },
          { id: "att-2", name: "report.pdf", mime: "application/pdf" },
          { id: "att-3", name: "data.csv", mime: "text/csv" },
          { id: "att-4", name: "unknown.bin" },
        ]}
      />
    );

    expect(screen.getByText("No")).toBeInTheDocument();
    expect(screen.getByText("Attachments")).toBeInTheDocument();
    expect(screen.getByText("door.png")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^View / })).toHaveLength(4);
  });

  it("picks the icon that matches each attachment mime type", () => {
    render(
      <AuditQuestionCard
        text="Is the door width compliant?"
        type="yes_no"
        answeredYes={false}
        attachments={[
          { id: "img", name: "door.png", mime: "image/png" },
          { id: "pdf", name: "report.pdf", mime: "application/pdf" },
          { id: "other", name: "data.csv", mime: "text/csv" },
          { id: "none", name: "unknown.bin" },
          { id: "null-mime", name: "nomime.bin", mime: null },
        ]}
      />
    );

    const iconClassFor = (id: string) =>
      screen
        .getByTestId(`attachment-${id}`)
        .querySelector("svg")
        ?.getAttribute("class");

    expect(iconClassFor("img")).toContain("lucide-image");
    expect(iconClassFor("pdf")).toContain("lucide-file-text");
    expect(iconClassFor("other")).toContain("lucide-file");
    expect(iconClassFor("none")).toContain("lucide-file");
    expect(iconClassFor("null-mime")).toContain("lucide-file");
  });

  it("calls onViewAttachment with the attachment that was clicked", async () => {
    const user = userEvent.setup();
    const onViewAttachment = vi.fn();
    const attachment: AttachmentVM = {
      id: "att-1",
      name: "door.png",
      mime: "image/png",
    };

    render(
      <AuditQuestionCard
        text="Is the door width compliant?"
        type="yes_no"
        answeredYes={false}
        attachments={[attachment]}
        onViewAttachment={onViewAttachment}
      />
    );

    await user.click(screen.getByRole("button", { name: "View door.png" }));

    expect(onViewAttachment).toHaveBeenCalledTimes(1);
    expect(onViewAttachment).toHaveBeenCalledWith(attachment);
  });

  it("keeps the view button inert when there is no onViewAttachment handler", async () => {
    const user = userEvent.setup();

    render(
      <AuditQuestionCard
        text="Is the door width compliant?"
        type="yes_no"
        answeredYes={false}
        attachments={[{ id: "att-1", name: "door.png" }]}
      />
    );

    // Sin handler el botón sigue existiendo pero no hace nada.
    await user.click(screen.getByRole("button", { name: "View door.png" }));

    expect(screen.getByText("door.png")).toBeInTheDocument();
  });

  it("omits the attachments block when the list is empty", () => {
    render(
      <AuditQuestionCard
        text="Is the door width compliant?"
        type="yes_no"
        answeredYes={false}
        attachments={[]}
      />
    );

    expect(screen.queryByText("Attachments")).not.toBeInTheDocument();
  });
});

describe("AuditQuestionCard — multiple choice", () => {
  it("renders the selected option as a pill", () => {
    render(
      <AuditQuestionCard
        text="Which surface material?"
        type="multiple_choice"
        answerValue="Concrete"
        notes="Confirmed on site"
      />
    );

    expect(screen.getByText("Concrete")).toBeInTheDocument();
    expect(screen.getByText("Confirmed on site")).toBeInTheDocument();
  });

  it("renders a numeric choice through the string cast", () => {
    render(
      <AuditQuestionCard
        text="Which surface material?"
        type="multiple_choice"
        answerValue={3}
      />
    );

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("falls back to the general layout when the choice is blank", () => {
    render(
      <AuditQuestionCard
        text="Which surface material?"
        type="multiple_choice"
        answerValue="   "
      />
    );

    expect(screen.getByText("Multiple Choice")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Which surface material?", level: 5 })
    ).toBeInTheDocument();
  });

  it("falls back to the general layout when the choice is null", () => {
    render(
      <AuditQuestionCard
        text="Which surface material?"
        type="multiple_choice"
        answerValue={null}
      />
    );

    expect(screen.getByText("Multiple Choice")).toBeInTheDocument();
  });
});

describe("AuditQuestionCard — general layout", () => {
  it("renders the index, the type label and the answer", () => {
    render(
      <AuditQuestionCard
        index={7}
        text="How many parking spaces?"
        type="number"
        answerValue={12}
      />
    );

    expect(screen.getByText("#7")).toBeInTheDocument();
    expect(screen.getByText("Number")).toBeInTheDocument();
    expect(screen.getByText("Answer:")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("treats a zero measurement as a real answer, not as a missing one", () => {
    render(
      <AuditQuestionCard
        text="Slope percentage at the landing"
        type="number"
        answerValue={0}
      />
    );

    // El 0 es una medición válida: la fila "Answer" debe mostrarse.
    expect(screen.getByText("Answer:")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("hides the answer row when the value is an empty string", () => {
    render(
      <AuditQuestionCard
        text="Observations"
        type="text"
        answerValue=""
      />
    );

    expect(screen.queryByText("Answer:")).not.toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
  });

  it("hides the answer row when the value is null", () => {
    render(
      <AuditQuestionCard text="Observations" type="text" answerValue={null} />
    );

    expect(screen.queryByText("Answer:")).not.toBeInTheDocument();
  });

  it("hides the answer row when there is no value at all", () => {
    render(<AuditQuestionCard text="Observations" type="text" />);

    expect(screen.queryByText("Answer:")).not.toBeInTheDocument();
  });

  it("omits the index when it is not a number", () => {
    render(
      <AuditQuestionCard text="Observations" type="text" answerValue="ok" />
    );

    expect(screen.queryByText(/^#/)).not.toBeInTheDocument();
  });

  it("renders the yes/no chip when answeredYes is null-free but the branch is general", () => {
    // answeredYes null no entra en las ramas YES/NO, así que cae en el layout
    // general y el chip no se dibuja.
    render(
      <AuditQuestionCard
        text="Observations"
        type="yes_no"
        answeredYes={null}
        answerValue="pending"
      />
    );

    expect(screen.queryByText("YES")).not.toBeInTheDocument();
    expect(screen.queryByText("NO")).not.toBeInTheDocument();
    expect(screen.getByText("Yes / No")).toBeInTheDocument();
  });

  it("renders the notes card and the attachments in the general layout", () => {
    render(
      <AuditQuestionCard
        text="Observations"
        type="text"
        answerValue="ok"
        notes="Needs a second visit"
        attachments={[{ id: "att-1", name: "note.txt", mime: "text/plain" }]}
      />
    );

    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByText("Needs a second visit")).toBeInTheDocument();
    expect(screen.getByText("Attachments")).toBeInTheDocument();
  });

  it("falls back to the raw type when it is not a known question type", () => {
    render(
      <AuditQuestionCard
        text="Observations"
        type={"signature" as QuestionType}
        answerValue="ok"
      />
    );

    expect(screen.getByText("signature")).toBeInTheDocument();
  });
});

describe("AuditQuestionCard — UNSURE read-only", () => {
  it("renders the UNSURE pill and the resolve button", () => {
    render(
      <AuditQuestionCard
        text="Is the signage readable?"
        type="yes_no"
        answerValue="UNSURE"
        notes="Photo was blurry"
      />
    );

    expect(screen.getByText("UNSURE")).toBeInTheDocument();
    expect(screen.getByText("Photo was blurry")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Resolve Answer..." })
    ).toBeInTheDocument();
  });

  it("detects the unsure state regardless of the answer casing", () => {
    render(
      <AuditQuestionCard
        text="Is the signage readable?"
        type="yes_no"
        answerValue="unsure"
      />
    );

    expect(
      screen.getByRole("button", { name: "Resolve Answer..." })
    ).toBeInTheDocument();
  });

  it("switches to the editing layout when the resolve button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <AuditQuestionCard
        auditId="a1"
        questionId="q1"
        steps={stepsWithForm}
        text="Is the signage readable?"
        type="yes_no"
        answerValue="UNSURE"
      />
    );

    await user.click(screen.getByRole("button", { name: "Resolve Answer..." }));

    expect(screen.getByText("UNSURE (Editing)")).toBeInTheDocument();
    expect(screen.getByText("Change Answer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "YES" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "NO" })).toBeInTheDocument();
  });
});

describe("AuditQuestionCard — UNSURE editing", () => {
  const renderEditing = async (
    props: Partial<React.ComponentProps<typeof AuditQuestionCard>> = {}
  ) => {
    const user = userEvent.setup();
    render(
      <AuditQuestionCard
        auditId="a1"
        questionId="q1"
        steps={stepsWithForm}
        text="Is the signage readable?"
        type="yes_no"
        answerValue="UNSURE"
        {...props}
      />
    );
    await user.click(screen.getByRole("button", { name: "Resolve Answer..." }));
    return user;
  };

  it("keeps Save disabled until an answer is picked", async () => {
    await renderEditing();

    expect(screen.getByRole("button", { name: /Save Changes/ })).toBeDisabled();
  });

  it("does not show the finding form for the YES path", async () => {
    const user = await renderEditing();

    await user.click(screen.getByRole("button", { name: "YES" }));

    expect(screen.queryByText("Finding details")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Save Changes/ })
    ).not.toBeDisabled();
  });

  it("sends only the answer update when the answer is YES", async () => {
    const user = await renderEditing();

    await user.click(screen.getByRole("button", { name: "YES" }));
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    await waitFor(() => expect(updateAnswerMock).toHaveBeenCalledTimes(1));
    expect(updateAnswerMock).toHaveBeenCalledWith({
      auditId: "a1",
      answers: [{ step_id: "q1", answer: "YES" }],
    });
    expect(alertMock).toHaveBeenCalledWith("Answer updated successfully");
  });

  it("shows the finding form fields declared by the linked Form step", async () => {
    const user = await renderEditing();

    await user.click(screen.getByRole("button", { name: "NO" }));

    expect(screen.getByText("Finding details")).toBeInTheDocument();
    expect(screen.getByText("Measurements")).toBeInTheDocument();
    expect(screen.getByText("(in)")).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. 34")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Describe the barrier")
    ).toBeInTheDocument();
  });

  it("sends a zero measurement as a real value on the NO path", async () => {
    const user = await renderEditing();

    await user.click(screen.getByRole("button", { name: "NO" }));
    await user.type(screen.getByPlaceholderText("e.g. 34"), "0");

    expect(screen.getByPlaceholderText("e.g. 34")).toHaveValue(0);

    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    await waitFor(() => expect(updateAnswerMock).toHaveBeenCalledTimes(1));
    expect(updateAnswerMock).toHaveBeenCalledWith({
      auditId: "a1",
      answers: [
        { step_id: "q1", answer: "NO" },
        { step_id: "f1", type: "form", values: { measurements: 0 } },
      ],
    });
  });

  it("sends the measurements and the notes typed in the finding form", async () => {
    const user = await renderEditing();

    await user.click(screen.getByRole("button", { name: "NO" }));
    await user.type(screen.getByPlaceholderText("e.g. 34"), "34");
    await user.type(
      screen.getByPlaceholderText("Describe the barrier"),
      "Handrail missing"
    );
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    await waitFor(() => expect(updateAnswerMock).toHaveBeenCalledTimes(1));
    expect(updateAnswerMock).toHaveBeenCalledWith({
      auditId: "a1",
      answers: [
        { step_id: "q1", answer: "NO" },
        {
          step_id: "f1",
          type: "form",
          values: { measurements: 34, notes: "Handrail missing" },
        },
      ],
    });
  });

  it("sends an empty string when a numeric field is cleared", async () => {
    const user = await renderEditing();

    await user.click(screen.getByRole("button", { name: "NO" }));
    const input = screen.getByPlaceholderText("e.g. 34");
    await user.type(input, "5");
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    await waitFor(() => expect(updateAnswerMock).toHaveBeenCalledTimes(1));
    // FIXME: al borrar un campo numérico se envía la cadena vacía en lugar de
    // omitir el campo o mandar null; el backend recibe "" como medición.
    expect(updateAnswerMock).toHaveBeenCalledWith({
      auditId: "a1",
      answers: [
        { step_id: "q1", answer: "NO" },
        { step_id: "f1", type: "form", values: { measurements: "" } },
      ],
    });
  });

  it("resets the draft form when the answer flips back to YES", async () => {
    const user = await renderEditing();

    await user.click(screen.getByRole("button", { name: "NO" }));
    await user.type(screen.getByPlaceholderText("e.g. 34"), "34");
    await user.click(screen.getByRole("button", { name: "YES" }));
    await user.click(screen.getByRole("button", { name: "NO" }));

    expect(screen.getByPlaceholderText("e.g. 34")).toHaveValue(null);
  });

  it("reads the camelCase noNext link as well as the snake_case one", async () => {
    const user = await renderEditing({
      steps: [
        { id: "q1", type: "Question", noNext: "f1" },
        { id: "f1", type: "Form", fields: [NUMBER_FIELD] },
      ],
    });

    await user.click(screen.getByRole("button", { name: "NO" }));

    expect(screen.getByText("Measurements")).toBeInTheDocument();
  });

  it("collects the fields of every chained Form step", async () => {
    const user = await renderEditing({
      steps: [
        { id: "q1", type: "Question", no_next: "f1" },
        { id: "f1", type: "Form", fields: [NUMBER_FIELD], next: "f2" },
        { id: "f2", type: "Form", fields: [TEXT_FIELD] },
      ],
    });

    await user.click(screen.getByRole("button", { name: "NO" }));
    await user.type(screen.getByPlaceholderText("e.g. 34"), "12");
    await user.type(
      screen.getByPlaceholderText("Describe the barrier"),
      "Blocked"
    );
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    await waitFor(() => expect(updateAnswerMock).toHaveBeenCalledTimes(1));
    expect(updateAnswerMock).toHaveBeenCalledWith({
      auditId: "a1",
      answers: [
        { step_id: "q1", answer: "NO" },
        { step_id: "f1", type: "form", values: { measurements: 12 } },
        { step_id: "f2", type: "form", values: { notes: "Blocked" } },
      ],
    });
  });

  it("stops after 20 hops when the Form steps form a cycle", async () => {
    const user = await renderEditing({
      steps: [
        { id: "q1", type: "Question", no_next: "f1" },
        { id: "f1", type: "Form", fields: [NUMBER_FIELD], next: "f1" },
      ],
    });

    await user.click(screen.getByRole("button", { name: "NO" }));

    // El guard de 20 iteraciones evita el bucle infinito al derivar campos.
    expect(screen.getAllByPlaceholderText("e.g. 34")).toHaveLength(20);

    await user.type(screen.getAllByPlaceholderText("e.g. 34")[0]!, "3");
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    await waitFor(() => expect(updateAnswerMock).toHaveBeenCalledTimes(1));
    const payload = updateAnswerMock.mock.calls[0]![0] as {
      answers: unknown[];
    };
    expect(payload.answers).toHaveLength(21);
  });

  it("skips the button fields when rendering the finding form", async () => {
    const user = await renderEditing({
      steps: [
        { id: "q1", type: "Question", no_next: "f1" },
        {
          id: "f1",
          type: "Form",
          fields: [NUMBER_FIELD, BUTTON_FIELD],
        },
      ],
    });

    await user.click(screen.getByRole("button", { name: "NO" }));

    expect(screen.queryByText("Submit")).not.toBeInTheDocument();
    expect(screen.getByText("Measurements")).toBeInTheDocument();
  });

  it("renders a number field without a unit suffix", async () => {
    const user = await renderEditing({
      steps: [
        { id: "q1", type: "Question", no_next: "f1" },
        {
          id: "f1",
          type: "Form",
          fields: [{ id: "count", type: "number", label: "Count" }],
        },
      ],
    });

    await user.click(screen.getByRole("button", { name: "NO" }));

    expect(screen.getByText("Count")).toBeInTheDocument();
    expect(screen.queryByText(/^\(/)).not.toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toHaveAttribute("placeholder", "");
  });

  it("renders a text field without a placeholder", async () => {
    const user = await renderEditing({
      steps: [
        { id: "q1", type: "Question", no_next: "f1" },
        {
          id: "f1",
          type: "Form",
          fields: [{ id: "detail", type: "text", label: "Detail" }],
        },
      ],
    });

    await user.click(screen.getByRole("button", { name: "NO" }));

    expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "");
  });
});

describe("AuditQuestionCard — generic finding form fallback", () => {
  const renderFallback = async (
    props: Partial<React.ComponentProps<typeof AuditQuestionCard>> = {}
  ) => {
    const user = userEvent.setup();
    render(
      <AuditQuestionCard
        auditId="a1"
        questionId="q1"
        text="Is the signage readable?"
        type="yes_no"
        answerValue="UNSURE"
        {...props}
      />
    );
    await user.click(screen.getByRole("button", { name: "Resolve Answer..." }));
    await user.click(screen.getByRole("button", { name: "NO" }));
    return user;
  };

  it("shows the generic quantity and notes form when the flow has no steps", async () => {
    await renderFallback();

    expect(screen.getByText("Quantity")).toBeInTheDocument();
    expect(screen.getByText("Notes / Measurements")).toBeInTheDocument();
    expect(
      screen.getByText(/Edit Finding.*dialog later to upload images/)
    ).toBeInTheDocument();
  });

  it("shows the generic form when the question step is not in the flow", async () => {
    await renderFallback({
      steps: [{ id: "other", type: "Question", no_next: "f1" }],
    });

    expect(screen.getByText("Quantity")).toBeInTheDocument();
  });

  it("shows the generic form when the question has no NO branch", async () => {
    await renderFallback({
      steps: [{ id: "q1", type: "Question" }],
    });

    expect(screen.getByText("Quantity")).toBeInTheDocument();
  });

  it("shows the generic form when the NO branch does not lead to a Form", async () => {
    await renderFallback({
      steps: [
        { id: "q1", type: "Question", no_next: "q2" },
        { id: "q2", type: "Question" },
      ],
    });

    expect(screen.getByText("Quantity")).toBeInTheDocument();
  });

  it("shows the generic form when the NO branch points to a missing step", async () => {
    await renderFallback({
      steps: [{ id: "q1", type: "Question", no_next: "ghost" }],
    });

    expect(screen.getByText("Quantity")).toBeInTheDocument();
  });

  it("sends the generic values under the NO branch step id when no Form is found", async () => {
    const user = await renderFallback({
      steps: [
        { id: "q1", type: "Question", no_next: "q2" },
        { id: "q2", type: "Question" },
      ],
    });

    await user.type(screen.getByRole("spinbutton"), "4");
    await user.type(screen.getByRole("textbox"), "Broken latch");
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    await waitFor(() => expect(updateAnswerMock).toHaveBeenCalledTimes(1));
    expect(updateAnswerMock).toHaveBeenCalledWith({
      auditId: "a1",
      answers: [
        { step_id: "q1", answer: "NO" },
        {
          step_id: "q2",
          type: "form",
          values: { quantity: 4, notes: "Broken latch" },
        },
      ],
    });
  });

  it("coerces a cleared generic quantity to zero", async () => {
    const user = await renderFallback({
      steps: [
        { id: "q1", type: "Question", no_next: "q2" },
        { id: "q2", type: "Question" },
      ],
    });

    const quantity = screen.getByRole("spinbutton");
    await user.type(quantity, "7");
    await user.clear(quantity);
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    await waitFor(() => expect(updateAnswerMock).toHaveBeenCalledTimes(1));
    // FIXME: en el formulario genérico borrar la cantidad manda 0, que es una
    // medición válida; no se puede distinguir "sin dato" de "cero".
    expect(updateAnswerMock).toHaveBeenCalledWith({
      auditId: "a1",
      answers: [
        { step_id: "q1", answer: "NO" },
        { step_id: "q2", type: "form", values: { quantity: 0 } },
      ],
    });
  });

  it("sends no form update when the NO branch has no target step", async () => {
    const user = await renderFallback({
      steps: [{ id: "q1", type: "Question" }],
    });

    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    await waitFor(() => expect(updateAnswerMock).toHaveBeenCalledTimes(1));
    expect(updateAnswerMock).toHaveBeenCalledWith({
      auditId: "a1",
      answers: [{ step_id: "q1", answer: "NO" }],
    });
  });
});

describe("AuditQuestionCard — photo fields", () => {
  const photoSteps = [
    { id: "q1", type: "Question", no_next: "f1" },
    { id: "f1", type: "Form", fields: [PHOTO_FIELD] },
  ];

  const openPhotoForm = async () => {
    const user = userEvent.setup();
    const view = render(
      <AuditQuestionCard
        auditId="a1"
        questionId="q1"
        steps={photoSteps}
        text="Is the signage readable?"
        type="yes_no"
        answerValue="UNSURE"
      />
    );
    await user.click(screen.getByRole("button", { name: "Resolve Answer..." }));
    await user.click(screen.getByRole("button", { name: "NO" }));
    const input = view.container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    return { user, input, view };
  };

  it("renders the file input without previews before any upload", async () => {
    const { input } = await openPhotoForm();

    expect(input).toBeInTheDocument();
    expect(input.multiple).toBe(true);
    expect(screen.getByText("Photos")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows a preview for every picked file and keeps appending", async () => {
    vi.spyOn(URL, "createObjectURL").mockImplementation(
      (file: Blob | MediaSource) => `blob:${(file as File).name}`
    );
    const { user, input } = await openPhotoForm();

    await user.upload(
      input,
      new File(["a"], "first.png", { type: "image/png" })
    );

    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByAltText("preview 0")).toHaveAttribute(
      "src",
      "blob:first.png"
    );

    await user.upload(
      input,
      new File(["b"], "second.png", { type: "image/png" })
    );

    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.getByAltText("preview 1")).toHaveAttribute(
      "src",
      "blob:second.png"
    );
  });

  it("uploads the picked files and sends the S3 urls under the photos key", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:one");
    postMock.mockResolvedValue({
      data: {
        urls: [
          {
            file_name: "first.png",
            upload_url: "https://s3.example.com/put/first.png",
            file_url: "https://s3.example.com/first.png",
          },
        ],
      },
    });
    uploadFileMock.mockResolvedValue(undefined);

    const { user, input } = await openPhotoForm();
    await user.upload(
      input,
      new File(["a"], "first.png", { type: "image/png" })
    );
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    await waitFor(() => expect(updateAnswerMock).toHaveBeenCalledTimes(1));

    expect(postMock).toHaveBeenCalledWith("/api/uploads", {
      audit_id: "a1",
      files: [{ name: "first.png", step_id: "f1" }],
    });
    expect(uploadFileMock).toHaveBeenCalledWith(
      "https://s3.example.com/put/first.png",
      expect.any(File)
    );
    expect(updateAnswerMock).toHaveBeenCalledWith({
      auditId: "a1",
      answers: [
        { step_id: "q1", answer: "NO" },
        {
          step_id: "f1",
          type: "form",
          values: { photos: ["https://s3.example.com/first.png"] },
        },
      ],
    });
  });

  it("keeps the already uploaded urls that are not blob previews", async () => {
    // Un preview que ya es una URL definitiva no debe perderse al guardar.
    vi.spyOn(URL, "createObjectURL").mockReturnValue(
      "https://cdn.example.com/existing.png"
    );
    postMock.mockResolvedValue({
      data: {
        urls: [
          {
            file_name: "first.png",
            upload_url: "https://s3.example.com/put/first.png",
            file_url: "https://s3.example.com/first.png",
          },
        ],
      },
    });
    uploadFileMock.mockResolvedValue(undefined);

    const { user, input } = await openPhotoForm();
    await user.upload(
      input,
      new File(["a"], "first.png", { type: "image/png" })
    );
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    await waitFor(() => expect(updateAnswerMock).toHaveBeenCalledTimes(1));
    expect(updateAnswerMock).toHaveBeenCalledWith({
      auditId: "a1",
      answers: [
        { step_id: "q1", answer: "NO" },
        {
          step_id: "f1",
          type: "form",
          values: {
            photos: [
              "https://cdn.example.com/existing.png",
              "https://s3.example.com/first.png",
            ],
          },
        },
      ],
    });
  });

  it("drops the files the presign response does not cover", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:one");
    postMock.mockResolvedValue({ data: { urls: [] } });

    const { user, input } = await openPhotoForm();
    await user.upload(
      input,
      new File(["a"], "first.png", { type: "image/png" })
    );
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    await waitFor(() => expect(updateAnswerMock).toHaveBeenCalledTimes(1));
    expect(uploadFileMock).not.toHaveBeenCalled();
    expect(updateAnswerMock).toHaveBeenCalledWith({
      auditId: "a1",
      answers: [
        { step_id: "q1", answer: "NO" },
        { step_id: "f1", type: "form", values: { photos: [] } },
      ],
    });
  });

  it("alerts and aborts the save when the upload fails", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:one");
    postMock.mockRejectedValue(new Error("presign down"));

    const { user, input } = await openPhotoForm();
    await user.upload(
      input,
      new File(["a"], "first.png", { type: "image/png" })
    );
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    await waitFor(() =>
      expect(alertMock).toHaveBeenCalledWith("Failed to upload files")
    );
    expect(updateAnswerMock).not.toHaveBeenCalled();
  });
});

describe("AuditQuestionCard — save guards and errors", () => {
  it("does nothing when there is no auditId", async () => {
    const user = userEvent.setup();
    render(
      <AuditQuestionCard
        questionId="q1"
        steps={stepsWithForm}
        text="Is the signage readable?"
        type="yes_no"
        answerValue="UNSURE"
      />
    );

    await user.click(screen.getByRole("button", { name: "Resolve Answer..." }));
    await user.click(screen.getByRole("button", { name: "YES" }));
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    expect(updateAnswerMock).not.toHaveBeenCalled();
    expect(alertMock).not.toHaveBeenCalled();
  });

  it("does nothing when there is no questionId", async () => {
    const user = userEvent.setup();
    render(
      <AuditQuestionCard
        auditId="a1"
        steps={stepsWithForm}
        text="Is the signage readable?"
        type="yes_no"
        answerValue="UNSURE"
      />
    );

    await user.click(screen.getByRole("button", { name: "Resolve Answer..." }));
    await user.click(screen.getByRole("button", { name: "NO" }));
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    expect(updateAnswerMock).not.toHaveBeenCalled();
  });

  it("alerts when the answer update fails and stays in the editing layout", async () => {
    const user = userEvent.setup();
    updateAnswerMock.mockRejectedValue(new Error("network down"));

    render(
      <AuditQuestionCard
        auditId="a1"
        questionId="q1"
        steps={stepsWithForm}
        text="Is the signage readable?"
        type="yes_no"
        answerValue="UNSURE"
      />
    );

    await user.click(screen.getByRole("button", { name: "Resolve Answer..." }));
    await user.click(screen.getByRole("button", { name: "YES" }));
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    await waitFor(() =>
      expect(alertMock).toHaveBeenCalledWith("Failed to update answer")
    );
    expect(screen.getByText("UNSURE (Editing)")).toBeInTheDocument();
  });

  it("leaves the editing layout when the update succeeds", async () => {
    const user = userEvent.setup();

    render(
      <AuditQuestionCard
        auditId="a1"
        questionId="q1"
        steps={stepsWithForm}
        text="Is the signage readable?"
        type="yes_no"
        answerValue="UNSURE"
      />
    );

    await user.click(screen.getByRole("button", { name: "Resolve Answer..." }));
    await user.click(screen.getByRole("button", { name: "YES" }));
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Resolve Answer..." })
      ).toBeInTheDocument()
    );
  });

  it("goes back to the read-only layout when editing is cancelled", async () => {
    const user = userEvent.setup();

    render(
      <AuditQuestionCard
        auditId="a1"
        questionId="q1"
        steps={stepsWithForm}
        text="Is the signage readable?"
        type="yes_no"
        answerValue="UNSURE"
      />
    );

    await user.click(screen.getByRole("button", { name: "Resolve Answer..." }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.getByRole("button", { name: "Resolve Answer..." })
    ).toBeInTheDocument();
  });

  it("disables both actions and shows the spinner while the update is pending", async () => {
    mutationState.isPending = true;
    const user = userEvent.setup();

    const { container } = render(
      <AuditQuestionCard
        auditId="a1"
        questionId="q1"
        steps={stepsWithForm}
        text="Is the signage readable?"
        type="yes_no"
        answerValue="UNSURE"
      />
    );

    await user.click(screen.getByRole("button", { name: "Resolve Answer..." }));
    await user.click(screen.getByRole("button", { name: "YES" }));

    expect(screen.getByRole("button", { name: /Save Changes/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
