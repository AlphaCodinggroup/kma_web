import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import FlowQuestionsDialog, {
  type FlowDetailVM,
  type QuestionType,
} from "../FlowQuestionsDialog";

// Flow de ejemplo reutilizado por los casos de render.
const baseFlow: FlowDetailVM = {
  title: "Ramps audit",
  description: "All ramp related questions",
  questions: [
    { id: "q1", text: "Is the ramp compliant?", type: "yes_no" },
    {
      id: "q2",
      text: "Which surface?",
      type: "multiple_choice",
      options: ["Concrete", "Asphalt"],
    },
    { id: "q3", text: "Notes", type: "text_input" },
  ],
};

function renderDialog(overrides: Partial<FlowDetailVM> = {}, open = true) {
  const onOpenChange = vi.fn();
  const utils = render(
    <FlowQuestionsDialog
      open={open}
      onOpenChange={onOpenChange}
      flow={{ ...baseFlow, ...overrides }}
    />
  );
  return { onOpenChange, ...utils };
}

describe("FlowQuestionsDialog", () => {
  it("renders nothing while closed", () => {
    renderDialog({}, false);

    expect(screen.queryByText("Ramps audit")).not.toBeInTheDocument();
  });

  it("renders the flow title, description and question count", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: "Ramps audit" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("All ramp related questions")
    ).toBeInTheDocument();
    expect(screen.getByText("Questions (3)")).toBeInTheDocument();
  });

  it("omits the description paragraph when there is none", () => {
    renderDialog({ description: "" });

    expect(
      screen.queryByText("All ramp related questions")
    ).not.toBeInTheDocument();
  });

  it("numbers each question card sequentially", () => {
    renderDialog();

    expect(screen.getByText("Q1")).toBeInTheDocument();
    expect(screen.getByText("Q2")).toBeInTheDocument();
    expect(screen.getByText("Q3")).toBeInTheDocument();
  });

  // Table-driven: cada tipo de pregunta tiene su propio badge legible.
  const badgeCases: Array<{ type: QuestionType; label: string }> = [
    { type: "yes_no", label: "Yes/No" },
    { type: "multiple_choice", label: "Multiple Choice" },
    { type: "text_input", label: "Text Input" },
  ];

  badgeCases.forEach(({ type, label }) => {
    it(`renders the "${label}" badge for a ${type} question`, () => {
      renderDialog({ questions: [{ id: "only", text: "T", type }] });

      const badge = screen.getByLabelText(`question-type-${type}`);
      expect(badge).toHaveTextContent(label);
    });
  });

  it("falls back to the raw type for an unknown question type", () => {
    renderDialog({
      questions: [
        { id: "only", text: "T", type: "weird" as unknown as QuestionType },
      ],
    });

    expect(screen.getByLabelText("question-type-weird")).toHaveTextContent(
      "weird"
    );
  });

  it("lists the options of a multiple choice question", () => {
    renderDialog();

    expect(screen.getByText("Options:")).toBeInTheDocument();
    expect(
      screen.getAllByRole("listitem").map((li) => li.textContent)
    ).toEqual(["Concrete", "Asphalt"]);
  });

  it("does not render an options list for a multiple choice question with no options", () => {
    renderDialog({
      questions: [
        { id: "q", text: "Which?", type: "multiple_choice", options: [] },
      ],
    });

    expect(screen.queryByText("Options:")).not.toBeInTheDocument();
  });

  it("renders the conditional hint when visibleIf is present", () => {
    renderDialog({
      questions: [
        {
          id: "q9",
          text: "Follow up",
          type: "yes_no",
          visibleIf: { questionId: "q1", equals: true },
        },
      ],
    });

    expect(screen.getByText("Conditional:")).toBeInTheDocument();
    expect(screen.getByText(/Shows when Q1 = "true"/)).toBeInTheDocument();
  });

  it("does not render the conditional hint when visibleIf is absent", () => {
    renderDialog();

    expect(screen.queryByText("Conditional:")).not.toBeInTheDocument();
  });

  it("closes through the close button", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(
      screen.getByRole("button", { name: "Close questions modal" })
    );

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("uses the provided data-testid on the inner dialog", () => {
    const onOpenChange = vi.fn();
    render(
      <FlowQuestionsDialog
        open
        onOpenChange={onOpenChange}
        flow={baseFlow}
        data-testid="custom-dialog"
      />
    );

    expect(screen.getByTestId("custom-dialog")).toBeInTheDocument();
  });

  it("falls back to a default data-testid", () => {
    renderDialog();

    expect(screen.getByTestId("flow-questions-dialog")).toBeInTheDocument();
  });
});
