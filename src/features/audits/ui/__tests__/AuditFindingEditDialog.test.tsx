import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuditFindingEditDialog from "../AuditFindingEditDialog";

const { updateFinding, reset } = vi.hoisted(() => ({
  updateFinding: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("../../lib/hooks/useUpdateAuditFindingMutation", () => ({
  useUpdateAuditFindingMutation: () => ({
    mutateAsync: updateFinding,
    reset,
    isPending: false,
    error: null,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  updateFinding.mockResolvedValue({});
});

describe("finding quantity precision", () => {
  it.each([2.5, 0.125, 0, 3])("saves quantity %s without rounding", async (quantity) => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <AuditFindingEditDialog
        open
        auditId="audit-1"
        questionCode="S-B16"
        onOpenChange={onOpenChange}
        defaultValues={{ quantity: 2, notes: "Existing note" }}
      />,
    );
    const input = screen.getByRole("spinbutton", { name: "Quantity" });
    expect(input).toHaveAttribute("step", "any");
    expect(input).toHaveAttribute("min", "0");
    await user.clear(input);
    await user.type(input, String(quantity));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(updateFinding).toHaveBeenCalledWith({
        auditId: "audit-1",
        questionCode: "S-B16",
        quantity,
        notes: "Existing note",
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("saves only a note while retaining an existing fractional quantity", async () => {
    const user = userEvent.setup();
    render(
      <AuditFindingEditDialog
        open
        auditId="audit-1"
        questionCode="S-B16"
        onOpenChange={vi.fn()}
        defaultValues={{ quantity: 2.5, notes: "Old note" }}
      />,
    );
    await user.clear(screen.getByRole("textbox", { name: "Notes" }));
    await user.type(screen.getByRole("textbox", { name: "Notes" }), "Updated note");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(updateFinding).toHaveBeenCalledWith({
        auditId: "audit-1",
        questionCode: "S-B16",
        quantity: 2.5,
        notes: "Updated note",
      }),
    );
  });

  it("still rejects negative quantities through native validation", async () => {
    const user = userEvent.setup();
    render(
      <AuditFindingEditDialog
        open
        auditId="audit-1"
        questionCode="S-B16"
        onOpenChange={vi.fn()}
        defaultValues={{ quantity: 2 }}
      />,
    );
    const input = screen.getByRole("spinbutton", { name: "Quantity" }) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "-1");
    expect(input.validity.rangeUnderflow).toBe(true);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(updateFinding).not.toHaveBeenCalled();
  });
});
