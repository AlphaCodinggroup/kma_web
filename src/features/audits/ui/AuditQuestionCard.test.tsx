import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateAnswer: vi.fn(),
  post: vi.fn(),
  uploadFile: vi.fn(),
  isPending: false,
}));

vi.mock("../lib/hooks/useUpdateAuditAnswerMutation", () => ({
  useUpdateAuditAnswerMutation: () => ({
    mutateAsync: mocks.updateAnswer,
    isPending: mocks.isPending,
  }),
}));
vi.mock("@shared/api/http.client", () => ({
  httpClient: { post: mocks.post },
}));
vi.mock("@features/flows/api/flows.repo.impl", () => ({
  flowsRepo: { uploadFile: mocks.uploadFile },
}));

import AuditQuestionCard from "./AuditQuestionCard";

const baseProps = {
  auditId: "audit-1",
  questionId: "Q1",
  text: "Is the entrance accessible?",
  type: "yes_no" as const,
};

const findingSteps = [
  { id: "Q1", type: "Question", no_next: "F1" },
  {
    id: "F1",
    type: "Form",
    next: "F2",
    fields: [
      { id: "quantity", type: "number", label: "Quantity", unit: "units" },
      { id: "details", type: "text", label: "Details", placeholder: "Describe it" },
      { id: "photo", type: "photo", label: "Evidence" },
      { id: "ignored", type: "button", label: "Ignored" },
    ],
  },
  {
    id: "F2",
    type: "Form",
    next: "END",
    fields: [{ id: "width", type: "number", label: "Width" }],
  },
  { id: "END", type: "End" },
];

describe("AuditQuestionCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isPending = false;
    mocks.updateAnswer.mockResolvedValue({ status: "ok" });
    mocks.uploadFile.mockResolvedValue(undefined);
    mocks.post.mockResolvedValue({ data: { urls: [] } });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("alert", vi.fn());
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:evidence"),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders yes, no and multiple-choice answers with their details", async () => {
    const user = userEvent.setup();
    const onViewAttachment = vi.fn();
    const { rerender } = render(
      <AuditQuestionCard {...baseProps} answeredYes notes="All clear" />,
    );
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("Auditor Notes")).toBeInTheDocument();

    rerender(
      <AuditQuestionCard
        {...baseProps}
        answeredYes={false}
        attachments={[
          { id: "pdf", name: "finding.pdf", mime: "application/pdf" },
          { id: "image", name: "photo.png", mime: "image/png" },
          { id: "file", name: "data.bin", mime: "application/octet-stream" },
          { id: "unknown", name: "unknown" },
        ]}
        onViewAttachment={onViewAttachment}
      />,
    );
    expect(screen.getByText("No")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "View photo.png" }));
    expect(onViewAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ id: "image" }),
    );

    rerender(
      <AuditQuestionCard
        {...baseProps}
        type="multiple_choice"
        answerValue="Ramp"
        notes="Chosen route"
      />,
    );
    expect(screen.getByText("Ramp")).toBeInTheDocument();
    expect(screen.getByText("Chosen route")).toBeInTheDocument();
  });

  it.each([
    ["number", 0, "Number"],
    ["text", "free text", "Text"],
    ["multiple_choice", " ", "Multiple Choice"],
  ] as const)("renders the general %s answer card", (type, answerValue, label) => {
    render(
      <AuditQuestionCard
        {...baseProps}
        index={4}
        type={type}
        answerValue={answerValue}
        notes="  "
        attachments={[{ id: "a1", name: "attachment.txt", mime: "text/plain" }]}
      />,
    );
    expect(screen.getByText("#4")).toBeInTheDocument();
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText("attachment.txt")).toBeInTheDocument();
    if (answerValue !== " ") {
      expect(screen.getByText(String(answerValue))).toBeInTheDocument();
    }
  });

  it("resolves an unsure answer as YES and supports cancel", async () => {
    const user = userEvent.setup();
    render(
      <AuditQuestionCard {...baseProps} answerValue="unsure" notes="Needs review" />,
    );
    await user.click(screen.getByRole("button", { name: "Resolve Answer..." }));
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Resolve Answer..." })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Resolve Answer..." }));
    await user.click(screen.getByRole("button", { name: "YES" }));
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() =>
      expect(mocks.updateAnswer).toHaveBeenCalledWith({
        auditId: "audit-1",
        answers: [{ step_id: "Q1", answer: "YES" }],
      }),
    );
    expect(alert).toHaveBeenCalledWith("Answer updated successfully");
  });

  it("keeps the editor open when updating the answer fails", async () => {
    const user = userEvent.setup();
    mocks.updateAnswer.mockRejectedValue(new Error("conflict"));
    render(<AuditQuestionCard {...baseProps} answerValue="UNSURE" />);
    await user.click(screen.getByRole("button", { name: "Resolve Answer..." }));
    await user.click(screen.getByRole("button", { name: "YES" }));
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(alert).toHaveBeenCalledWith("Failed to update answer"));
    expect(screen.getByText("UNSURE (Editing)")).toBeInTheDocument();
  });

  it("submits fallback finding values when the configured form is missing", async () => {
    const user = userEvent.setup();
    render(
      <AuditQuestionCard
        {...baseProps}
        answerValue="UNSURE"
        steps={[
          { id: "Q1", type: "Question", noNext: "missing-form" },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Resolve Answer..." }));
    await user.click(screen.getByRole("button", { name: "NO" }));
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Notes / Measurements"), {
      target: { value: "Three steps" },
    });
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() =>
      expect(mocks.updateAnswer).toHaveBeenCalledWith({
        auditId: "audit-1",
        answers: [
          { step_id: "Q1", answer: "NO" },
          {
            step_id: "missing-form",
            type: "form",
            values: { quantity: 3, notes: "Three steps" },
          },
        ],
      }),
    );
  });

  it("uploads evidence and submits each form in the configured chain once", async () => {
    const user = userEvent.setup();
    mocks.post.mockResolvedValue({
      data: {
        urls: [
          {
            file_name: "evidence.png",
            upload_url: "https://upload.example/evidence",
            file_url: "s3://evidence/final.png",
          },
        ],
      },
    });
    render(
      <AuditQuestionCard
        {...baseProps}
        answerValue="UNSURE"
        steps={findingSteps}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Resolve Answer..." }));
    await user.click(screen.getByRole("button", { name: "NO" }));
    fireEvent.change(screen.getByLabelText(/Quantity/), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Details"), {
      target: { value: "Broken rail" },
    });
    fireEvent.change(screen.getByLabelText("Width"), { target: { value: "95" } });
    const evidence = new File(["image"], "evidence.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Evidence"), evidence);
    expect(screen.getByAltText("preview 0")).toHaveAttribute("src", "blob:evidence");

    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(mocks.updateAnswer).toHaveBeenCalledOnce());
    expect(mocks.post).toHaveBeenCalledWith("/api/uploads", {
      audit_id: "audit-1",
      files: [{ name: "evidence.png", step_id: "F1" }],
    });
    expect(mocks.uploadFile).toHaveBeenCalledWith(
      "https://upload.example/evidence",
      evidence,
    );
    expect(mocks.updateAnswer).toHaveBeenCalledWith({
      auditId: "audit-1",
      answers: [
        { step_id: "Q1", answer: "NO" },
        {
          step_id: "F1",
          type: "form",
          values: {
            quantity: 2,
            details: "Broken rail",
            photos: ["s3://evidence/final.png"],
          },
        },
        { step_id: "F2", type: "form", values: { width: 95 } },
      ],
    });
  });

  it("reports an incomplete presign response and preserves the draft for retry", async () => {
    const user = userEvent.setup();
    render(
      <AuditQuestionCard
        {...baseProps}
        answerValue="UNSURE"
        steps={findingSteps}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Resolve Answer..." }));
    await user.click(screen.getByRole("button", { name: "NO" }));
    await user.upload(
      screen.getByLabelText("Evidence"),
      new File(["image"], "missing.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(alert).toHaveBeenCalledWith("Failed to upload files"));
    expect(mocks.updateAnswer).not.toHaveBeenCalled();
    expect(screen.getByText("Finding details")).toBeInTheDocument();
    expect(screen.getByAltText("preview 0")).toBeInTheDocument();
  });

  it("breaks cyclic form links without duplicating answer updates", async () => {
    const user = userEvent.setup();
    const cyclicSteps = [
      { id: "Q1", type: "Question", no_next: "F1" },
      {
        id: "F1",
        type: "Form",
        next: "F2",
        fields: [{ id: "first", type: "text", label: "First" }],
      },
      {
        id: "F2",
        type: "Form",
        next: "F1",
        fields: [{ id: "second", type: "text", label: "Second" }],
      },
    ];
    render(
      <AuditQuestionCard
        {...baseProps}
        answerValue="UNSURE"
        steps={cyclicSteps}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Resolve Answer..." }));
    await user.click(screen.getByRole("button", { name: "NO" }));
    await user.type(screen.getByLabelText("First"), "one");
    await user.type(screen.getByLabelText("Second"), "two");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(mocks.updateAnswer).toHaveBeenCalledOnce());
    expect(mocks.updateAnswer.mock.calls[0][0].answers).toHaveLength(3);
  });

  it("disables editing actions while a mutation is pending", async () => {
    const user = userEvent.setup();
    mocks.isPending = true;
    render(<AuditQuestionCard {...baseProps} answerValue="UNSURE" />);
    await user.click(screen.getByRole("button", { name: "Resolve Answer..." }));
    await user.click(screen.getByRole("button", { name: "YES" }));
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
