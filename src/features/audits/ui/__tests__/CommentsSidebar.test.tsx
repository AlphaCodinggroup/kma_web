import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommentsSidebar from "../CommentsSidebar";

const boundary = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), refetch: vi.fn(), isError: false, comments: [] as unknown[] }));
vi.mock("@features/audits/lib/hooks/useCreateAuditCommentMutation", () => ({ useCreateAuditCommentMutation: () => ({ mutateAsync: boundary.create, isPending: false }) }));
vi.mock("@features/audits/lib/hooks/useUpdateAuditCommentMutation", () => ({ useUpdateAuditCommentMutation: () => ({ mutateAsync: boundary.update, isPending: false }) }));
vi.mock("@features/audits/lib/hooks/useAuditComments", () => ({ useAuditComments: () => ({ data: { comments: boundary.comments }, isLoading: false, isError: boundary.isError, refetch: boundary.refetch }) }));

const selected = { id: "step-1", title: "Entrance clearance" };

describe("CommentsSidebar", () => {
  beforeEach(() => { vi.clearAllMocks(); boundary.isError = false; boundary.comments = []; });

  it("shows a load error with a retry rather than a false empty state", async () => {
    boundary.isError = true;
    render(<CommentsSidebar auditId="audit-1" selected={selected} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Comments could not be loaded");
    await userEvent.click(screen.getByRole("button", { name: "Retry comments" }));
    expect(boundary.refetch).toHaveBeenCalledOnce();
    expect(screen.queryByText(/No comments yet/)).toBeNull();
  });

  it("preserves comment input and shows an error after a failed save", async () => {
    boundary.create.mockRejectedValue(new Error("offline"));
    render(<CommentsSidebar auditId="audit-1" selected={selected} />);
    await userEvent.type(screen.getByLabelText("Add a comment"), "Please check this measurement.");
    await userEvent.click(screen.getByRole("button", { name: "Comment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Comment could not be saved");
    expect(screen.getByLabelText("Add a comment")).toHaveValue("Please check this measurement.");
  });

  it("posts for the selected step and clears input only after success", async () => {
    boundary.create.mockResolvedValue({ id: "comment-1", content: "Check width", createdAt: "2026-10-07T10:00:00Z" });
    render(<CommentsSidebar auditId="audit-1" selected={selected} />);
    await userEvent.type(screen.getByLabelText("Add a comment"), "Check width");
    await userEvent.click(screen.getByRole("button", { name: "Comment" }));
    expect(boundary.create).toHaveBeenCalledWith({ auditId: "audit-1", stepId: "step-1", content: "Check width" });
    await waitFor(() => expect(screen.getByLabelText("Add a comment")).toHaveValue(""));
    expect(screen.getByText("Check width")).toBeInTheDocument();
  });

  it("blocks duplicate posts while the first request is pending", async () => {
    let finish!: (value: unknown) => void;
    boundary.create.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<CommentsSidebar auditId="audit-1" selected={selected} />);
    await userEvent.type(screen.getByLabelText("Add a comment"), "Check width");
    await userEvent.dblClick(screen.getByRole("button", { name: "Comment" }));
    expect(boundary.create).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Comment" })).toBeDisabled();
    finish({ id: "comment-1", content: "Check width", createdAt: "2026-10-07T10:00:00Z" });
    await waitFor(() => expect(screen.getByLabelText("Add a comment")).toHaveValue(""));
  });
});
