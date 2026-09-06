import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  mutationError: null as Error | null,
}));
vi.mock("../lib/hooks/useUpdateAuditFindingMutation", () => ({
  useUpdateAuditFindingMutation: () => ({
    mutateAsync: mocks.update,
    reset: mocks.reset,
    isPending: mocks.isPending,
    error: mocks.mutationError,
  }),
}));

import AuditFindingEditDialog from "./AuditFindingEditDialog";

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  auditId: "audit-1",
  questionCode: " Q1 ",
  expectedVersion: 0,
  defaultValues: { quantity: 2, notes: "Original" },
};

describe("AuditFindingEditDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isPending = false;
    mocks.mutationError = null;
    mocks.update.mockResolvedValue({});
    baseProps.onOpenChange = vi.fn();
  });
  afterEach(() => cleanup());

  it("resets on open and submits normalized changed values with version zero", async () => {
    const user = userEvent.setup();
    render(<AuditFindingEditDialog {...baseProps} title="Correct finding" />);
    expect(screen.getByRole("heading", { name: "Correct finding" })).toBeInTheDocument();
    expect(mocks.reset).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    await user.clear(screen.getByLabelText("Quantity"));
    await user.type(screen.getByLabelText("Quantity"), "4");
    await user.clear(screen.getByLabelText("Notes"));
    await user.type(screen.getByLabelText("Notes"), " Updated note ");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith({
        auditId: "audit-1",
        questionCode: "Q1",
        expectedVersion: 0,
        quantity: 4,
        notes: "Updated note",
      }),
    );
    expect(baseProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("clears optional quantity and notes", async () => {
    const user = userEvent.setup();
    render(<AuditFindingEditDialog {...baseProps} />);
    await user.clear(screen.getByLabelText("Quantity"));
    await user.clear(screen.getByLabelText("Notes"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(mocks.update).toHaveBeenCalledWith({
      auditId: "audit-1",
      questionCode: "Q1",
      expectedVersion: 0,
      notes: null,
    });
  });

  it("rejects missing identifiers and negative quantities", async () => {
    const { rerender } = render(
      <AuditFindingEditDialog {...baseProps} auditId="" questionCode="   " />,
    );
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "changed" } });
    fireEvent.submit(screen.getByLabelText("Notes").closest("form")!);
    expect(await screen.findByText("Missing auditId or questionCode.")).toBeInTheDocument();
    expect(mocks.update).not.toHaveBeenCalled();

    rerender(<AuditFindingEditDialog {...baseProps} defaultValues={{ quantity: 1, notes: "" }} />);
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "-1" } });
    fireEvent.submit(screen.getByLabelText("Quantity").closest("form")!);
    expect(await screen.findByText("Quantity must be a non-negative number.")).toBeInTheDocument();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("shows mutation failures and hook errors", async () => {
    const user = userEvent.setup();
    mocks.update.mockRejectedValue(new Error("Version conflict"));
    const { rerender } = render(<AuditFindingEditDialog {...baseProps} />);
    await user.type(screen.getByLabelText("Notes"), " changed");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Version conflict")).toBeInTheDocument();

    mocks.mutationError = new Error("Server unavailable");
    rerender(<AuditFindingEditDialog {...baseProps} />);
    expect(screen.getByText("Version conflict")).toBeInTheDocument();
  });

  it("disables controls while pending and supports both close actions", async () => {
    const user = userEvent.setup();
    mocks.isPending = true;
    render(<AuditFindingEditDialog {...baseProps} />);
    expect(screen.getByLabelText("Quantity")).toBeDisabled();
    expect(screen.getByLabelText("Notes")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    mocks.isPending = false;
    cleanup();
    render(<AuditFindingEditDialog {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(baseProps.onOpenChange).toHaveBeenCalledWith(false);
  });
});
