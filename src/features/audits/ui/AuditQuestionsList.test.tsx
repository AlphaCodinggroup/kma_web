import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ card: vi.fn() }));

vi.mock("./AuditQuestionCard", () => ({
  default: (props: Record<string, unknown>) => {
    mocks.card(props);
    return (
      <div
        data-testid={`card-${String(props.questionId)}`}
        data-answer={String(props.answerValue ?? "")}
        data-yes={String(props.answeredYes ?? "")}
        data-index={String(props.index ?? "")}
        data-attachments={JSON.stringify(props.attachments ?? [])}
      >
        {String(props.text)}
      </div>
    );
  },
}));

import { AuditQuestionsList, type QuestionItemVM } from "./AuditQuestionsList";

const items: QuestionItemVM[] = [
  { id: "yes", text: "Boolean yes", type: "yes_no", answer: true, order: 5 } as QuestionItemVM,
  { id: "si", text: "Spanish yes", type: "yes_no", answer: "si" } as QuestionItemVM,
  { id: "no", text: "String no", type: "yes_no", answer: "FALSE" } as QuestionItemVM,
  { id: "unsure", text: "Explicit unsure", type: "yes_no", answerValue: "UNSURE" },
  { id: "review", text: "Review note", type: "text", notes: "Needs REVIEW soon" },
  { id: "unclear", text: "Unclear note", type: "text", notes: "This is unclear" },
  { id: "number", text: "Number zero", type: "number", answer: 0 } as QuestionItemVM,
  { id: "empty", text: "No answer", type: "text", answerValue: "  ", notes: " " },
];

describe("AuditQuestionsList", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("normalizes legacy boolean and string answers while omitting empty items", () => {
    render(
      <AuditQuestionsList
        auditId="audit-1"
        steps={[{ id: "Q1" }]}
        items={items}
        className="custom-list"
        containerPaddingClassName="custom-padding"
        ariaLabelledById="questions-title"
      />,
    );
    expect(screen.queryByTestId("card-empty")).not.toBeInTheDocument();
    expect(screen.getByTestId("card-yes")).toHaveAttribute("data-yes", "true");
    expect(screen.getByTestId("card-yes")).toHaveAttribute("data-answer", "YES");
    expect(screen.getByTestId("card-yes")).toHaveAttribute("data-index", "5");
    expect(screen.getByTestId("card-si")).toHaveAttribute("data-yes", "true");
    expect(screen.getByTestId("card-no")).toHaveAttribute("data-yes", "false");
    expect(screen.getByTestId("card-number")).toHaveAttribute("data-answer", "0");
    expect(screen.getByTestId("audit-questions-list")).toHaveAttribute(
      "aria-labelledby",
      "questions-title",
    );
    expect(screen.getByTestId("audit-questions-list")).toHaveClass("custom-list", "custom-padding");
    expect(screen.getByTestId("card-yes")).toHaveAttribute("data-attachments", "[]");
  });

  it.each([
    ["yes", ["yes", "si"]],
    ["no", ["no"]],
    ["unsure", ["unsure", "review", "unclear"]],
  ] as const)("filters %s answers", (filterMode, expectedIds) => {
    render(
      <AuditQuestionsList
        items={items}
        filterMode={filterMode}
      />,
    );
    expect(screen.getAllByTestId(/^card-/)).toHaveLength(expectedIds.length);
    for (const id of expectedIds) {
      expect(screen.getByTestId(`card-${id}`)).toBeInTheDocument();
    }
  });

  it.each([
    ["all", "No questions available."],
    ["yes", "No questions with YES answer found."],
    ["no", "No questions with NO answer found."],
    ["unsure", "No questions requiring further review found."],
  ] as const)("shows the %s empty state", (filterMode, message) => {
    render(<AuditQuestionsList items={[]} filterMode={filterMode} />);
    expect(screen.getByRole("status")).toHaveTextContent(message);
  });

  it("falls back to all answered items for an unknown runtime filter", () => {
    render(
      <AuditQuestionsList
        items={items}
        filterMode={"unexpected" as never}
      />,
    );
    expect(screen.getAllByTestId(/^card-/)).toHaveLength(7);
  });
});
