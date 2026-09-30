import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Pencil } from "lucide-react";
import RowActionButton from "../row-action-button";

describe("RowActionButton", () => {
  it("renders a button labelled and titled with ariaLabel", () => {
    render(<RowActionButton icon={Pencil} ariaLabel="Edit user" />);

    const button = screen.getByRole("button", { name: "Edit user" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("title", "Edit user");
  });

  it("renders the given icon", () => {
    const { container } = render(
      <RowActionButton icon={Pencil} ariaLabel="Edit user" />
    );

    expect(container.querySelector("svg")).not.toBeNull();
  });

  const sizeCases: Array<{ size: "sm" | "md" | undefined; expected: string }> = [
    { size: "sm", expected: "h-8" },
    { size: "md", expected: "h-9" },
    { size: undefined, expected: "h-9" },
  ];

  it.each(sizeCases)("applies the $size size classes", ({ size, expected }) => {
    render(
      <RowActionButton
        icon={Pencil}
        ariaLabel="Sized"
        {...(size !== undefined ? { size } : {})}
      />
    );

    expect(screen.getByRole("button", { name: "Sized" })).toHaveClass(
      expected,
      "rounded-lg"
    );
  });

  const variantCases: Array<{
    variant: "default" | "danger" | undefined;
    expected: string;
  }> = [
    { variant: "default", expected: "text-black" },
    { variant: "danger", expected: "text-red-600" },
    { variant: undefined, expected: "text-black" },
  ];

  it.each(variantCases)(
    "applies the $variant variant classes",
    ({ variant, expected }) => {
      render(
        <RowActionButton
          icon={Pencil}
          ariaLabel="Variant"
          {...(variant !== undefined ? { variant } : {})}
        />
      );

      expect(screen.getByRole("button", { name: "Variant" })).toHaveClass(
        expected,
        "bg-white"
      );
    }
  );

  it("marks itself as clickable when enabled", () => {
    render(<RowActionButton icon={Pencil} ariaLabel="Enabled" />);

    const button = screen.getByRole("button", { name: "Enabled" });
    expect(button).toBeEnabled();
    expect(button).toHaveClass("cursor-pointer");
    expect(button).not.toHaveClass("opacity-60");
  });

  it("dims itself when disabled", () => {
    render(<RowActionButton icon={Pencil} ariaLabel="Disabled" disabled />);

    const button = screen.getByRole("button", { name: "Disabled" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("opacity-60", "hover:bg-white");
    expect(button).not.toHaveClass("cursor-pointer");
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <RowActionButton icon={Pencil} ariaLabel="Clickable" onClick={onClick} />
    );

    await user.click(screen.getByRole("button", { name: "Clickable" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick while disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <RowActionButton
        icon={Pencil}
        ariaLabel="Blocked"
        onClick={onClick}
        disabled
      />
    );

    await user.click(screen.getByRole("button", { name: "Blocked" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("merges a custom className", () => {
    render(
      <RowActionButton
        icon={Pencil}
        ariaLabel="Classy"
        className="button-extra"
      />
    );

    expect(screen.getByRole("button", { name: "Classy" })).toHaveClass(
      "button-extra",
      "inline-flex"
    );
  });

  it("forwards extra button props and lets title override ariaLabel", () => {
    render(
      <RowActionButton
        icon={Pencil}
        ariaLabel="Edit user"
        title="Only administrators can edit users"
        data-testid="row-action"
        id="row-action-id"
      />
    );

    const button = screen.getByTestId("row-action");
    expect(button).toHaveAttribute("id", "row-action-id");
    expect(button).toHaveAttribute(
      "title",
      "Only administrators can edit users"
    );
    expect(button).toHaveAccessibleName("Edit user");
  });
});
