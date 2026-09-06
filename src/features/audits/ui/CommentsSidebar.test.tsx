import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  creating: false,
  updating: false,
  fetching: false,
  fetched: undefined as any,
  useComments: vi.fn(),
}));
vi.mock("../lib/hooks/useCreateAuditCommentMutation", () => ({
  useCreateAuditCommentMutation: () => ({ mutateAsync: mocks.create, isPending: mocks.creating }),
}));
vi.mock("../lib/hooks/useUpdateAuditCommentMutation", () => ({
  useUpdateAuditCommentMutation: () => ({ mutateAsync: mocks.update, isPending: mocks.updating }),
}));
vi.mock("../lib/hooks/useAuditComments", () => ({
  useAuditComments: (...args: unknown[]) => {
    mocks.useComments(...args);
    return { data: mocks.fetched, isLoading: mocks.fetching };
  },
}));

import CommentsSidebar from "./CommentsSidebar";

const selected = { id: "Q1", title: "Door finding" };
const comment = {
  id: "comment-1",
  auditId: "audit-1",
  stepId: "Q1",
  userId: "admin-1",
  content: "Initial comment",
  version: 1,
  createdAt: "2026-01-01T10:00:00Z",
  updatedAt: "2026-01-01T11:00:00Z",
};

describe("CommentsSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.creating = false;
    mocks.updating = false;
    mocks.fetching = false;
    mocks.fetched = { comments: [comment, { ...comment, id: "other", stepId: "Q2" }] };
    mocks.create.mockResolvedValue({ ...comment, id: "created", content: "New comment" });
    mocks.update.mockResolvedValue({ ...comment, content: "Edited comment", updatedAt: "2026-01-02T00:00:00Z" });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("does not render without a target and disables comment fetching", () => {
    const { container } = render(<CommentsSidebar auditId="audit-1" />);
    expect(container).toBeEmptyDOMElement();
    expect(mocks.useComments).toHaveBeenCalledWith("audit-1", { enabled: false });
  });

  it("loads and filters comments for the selected finding", () => {
    render(<CommentsSidebar auditId="audit-1" selected={selected} className="custom-sidebar" />);
    expect(screen.getByRole("complementary", { name: "Comments Panel" })).toHaveClass("custom-sidebar");
    expect(screen.getByText("Initial comment")).toBeInTheDocument();
    expect(screen.queryByText("other")).not.toBeInTheDocument();
    expect(mocks.useComments).toHaveBeenCalledWith("audit-1", { enabled: true });
  });

  it("creates a trimmed comment and prepends it locally", async () => {
    const user = userEvent.setup();
    render(<CommentsSidebar auditId="audit-1" selected={selected} />);
    const input = screen.getByLabelText("Add a comment");
    await user.type(input, "  New comment  ");
    await user.click(screen.getByRole("button", { name: "Comment" }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        auditId: "audit-1",
        stepId: "Q1",
        content: "New comment",
      }),
    );
    expect(screen.getByText("New comment")).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("edits an existing comment", async () => {
    const user = userEvent.setup();
    render(<CommentsSidebar auditId="audit-1" selected={selected} />);
    await user.click(screen.getByRole("button", { name: "Edit comment" }));
    expect(screen.getByLabelText("Add a comment")).toHaveValue("Initial comment");
    await user.clear(screen.getByLabelText("Add a comment"));
    await user.type(screen.getByLabelText("Add a comment"), "Edited comment");
    await user.click(screen.getByRole("button", { name: "Comment" }));
    expect(mocks.update).toHaveBeenCalledWith({
      commentId: "comment-1",
      auditId: "audit-1",
      stepId: "Q1",
      content: "Edited comment",
    });
    await screen.findByText("Edited comment");
  });

  it("shows loading and empty states", () => {
    mocks.fetching = true;
    const { rerender } = render(<CommentsSidebar auditId="audit-1" selected={selected} />);
    expect(screen.getByText("Loading comments…")).toBeInTheDocument();
    mocks.fetching = false;
    mocks.fetched = { comments: [] };
    rerender(<CommentsSidebar auditId="audit-1" selected={selected} />);
    expect(screen.getByText("No comments yet. Start the discussion below.")).toBeInTheDocument();
  });

  it("surfaces save failures and allows a retry", async () => {
    const user = userEvent.setup();
    mocks.create.mockRejectedValueOnce(new Error("Comment conflict"));
    render(<CommentsSidebar auditId="audit-1" selected={selected} />);
    await user.type(screen.getByLabelText("Add a comment"), "retry me");
    await user.click(screen.getByRole("button", { name: "Comment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Comment conflict");
    expect(screen.getByLabelText("Add a comment")).toHaveValue("retry me");
    await user.click(screen.getByRole("button", { name: "Comment" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("disables the editor while fetching or saving and closes from both controls", async () => {
    const onClose = vi.fn();
    mocks.fetching = true;
    const { rerender } = render(
      <CommentsSidebar auditId="audit-1" selected={selected} onClose={onClose} />,
    );
    expect(screen.getByLabelText("Add a comment")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Comment" })).toBeDisabled();
    mocks.fetching = false;
    rerender(<CommentsSidebar auditId="audit-1" selected={selected} onClose={onClose} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Close comments panel" }));
    await userEvent.setup().click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
