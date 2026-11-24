import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FlowCategoryDialog } from "../FlowCategoryDialog";

describe("FlowCategoryDialog", () => {
  it("validates empty name and submits trimmed create values", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <FlowCategoryDialog
        open={true}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByRole("heading", { name: "Create category" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create category" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Category name is required.");
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Name"), "  Accessible Routes  ");
    await user.type(screen.getByLabelText("Description"), "  Paths and ramps  ");
    await user.click(screen.getByRole("button", { name: "Create category" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Accessible Routes",
      description: "Paths and ramps",
      isActive: true,
    });
  });

  it("populates fields in edit mode and allows toggling active state", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <FlowCategoryDialog
        open={true}
        onOpenChange={vi.fn()}
        category={{
          id: "cat-1",
          name: "Restrooms",
          description: "Toilet rooms",
          isActive: true,
        }}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByRole("heading", { name: "Edit category" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Restrooms");
    expect(screen.getByLabelText("Description")).toHaveValue("Toilet rooms");

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Restrooms Updated");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Restrooms Updated",
      description: "Toilet rooms",
      isActive: false,
    });
  });

  it("shows server error and disables controls while submitting", () => {
    render(
      <FlowCategoryDialog
        open={true}
        onOpenChange={vi.fn()}
        isSubmitting={true}
        error="Duplicate category"
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Duplicate category");
    expect(screen.getByLabelText("Name")).toBeDisabled();
    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
  });
});
