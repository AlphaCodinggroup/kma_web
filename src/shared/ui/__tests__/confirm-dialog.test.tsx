import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import ConfirmDialog, { type ConfirmDialogProps } from "../confirm-dialog";

// Props mínimas requeridas; cada test agrega sólo lo que necesita.
function renderDialog(overrides?: Partial<ConfirmDialogProps>) {
  const props: ConfirmDialogProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: "Delete user",
    ...overrides,
  };

  const utils = render(<ConfirmDialog {...props} />);
  return { ...utils, props };
}

describe("ConfirmDialog", () => {
  it("renders nothing while closed", () => {
    renderDialog({ open: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the dialog with its title when open", () => {
    renderDialog();

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(
      screen.getByRole("heading", { name: "Delete user" })
    ).toBeInTheDocument();
  });

  it("renders the description when provided", () => {
    renderDialog({ description: "This action cannot be undone" });

    expect(
      screen.getByText("This action cannot be undone")
    ).toBeInTheDocument();
  });

  it("omits the description node when not provided", () => {
    const { container } = renderDialog();

    expect(container.querySelector("p")).toBeNull();
  });

  it("uses the default confirm and cancel labels", () => {
    renderDialog();

    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("honours custom confirm and cancel labels", () => {
    renderDialog({ confirmLabel: "Delete", cancelLabel: "Keep" });

    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep" })).toBeInTheDocument();
  });

  it("closes through onOpenChange when cancel is clicked", async () => {
    const user = userEvent.setup();
    const { props } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onConfirm when confirm is clicked", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onConfirm });

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("awaits an async onConfirm", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderDialog({ onConfirm });

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("does not fail when confirm is clicked without onConfirm", async () => {
    const user = userEvent.setup();
    const { props } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(props.onOpenChange).not.toHaveBeenCalled();
  });

  it("disables both buttons and shows the loading label while loading", () => {
    renderDialog({ loading: true });

    // El botón de confirmar pasa a isLoading, por lo que su texto cambia.
    expect(screen.getByRole("button", { name: "Loading..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("does not call onConfirm while loading", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onConfirm, loading: true });

    await user.click(screen.getByRole("button", { name: "Loading..." }));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  const loadingCases: Array<{ loading: boolean | null | undefined; disabled: boolean }> =
    [
      { loading: true, disabled: true },
      { loading: false, disabled: false },
      { loading: undefined, disabled: false },
    ];

  it.each(loadingCases)(
    "computes the disabled state when loading is $loading",
    ({ loading, disabled }) => {
      renderDialog(
        loading !== undefined ? { loading: loading ?? undefined } : {}
      );

      const cancel = screen.getByRole("button", { name: "Cancel" });
      if (disabled) {
        expect(cancel).toBeDisabled();
      } else {
        expect(cancel).toBeEnabled();
      }
    }
  );

  it("renders the error message when error is set", () => {
    renderDialog({ error: "Deletion failed" });

    const error = screen.getByText("Deletion failed");
    expect(error).toHaveClass("text-red-600");
  });

  it("does not render an error message when error is null", () => {
    renderDialog({ error: null });

    expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
  });

  it("paints the confirm button as destructive", () => {
    renderDialog();

    expect(screen.getByRole("button", { name: "Confirm" })).toHaveClass(
      "bg-red-600",
      "rounded-xl"
    );
  });

  it("merges a custom className on the modal content", () => {
    const { container } = renderDialog({ className: "dialog-extra" });

    expect(container.querySelector(".dialog-extra")).not.toBeNull();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    const { props } = renderDialog();

    await user.keyboard("{Escape}");

    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("accepts a React node as the title", () => {
    renderDialog({ title: <span data-testid="custom-title">Careful</span> });

    expect(screen.getByTestId("custom-title")).toHaveTextContent("Careful");
  });
});
