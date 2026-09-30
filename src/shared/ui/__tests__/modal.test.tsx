import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalCloseButton,
} from "../modal";

describe("Modal", () => {
  it("renders nothing while closed", () => {
    const { container } = render(
      <Modal open={false} onOpenChange={vi.fn()}>
        <p>Hidden body</p>
      </Modal>
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText("Hidden body")).not.toBeInTheDocument();
  });

  it("renders a dialog with its children while open", () => {
    render(
      <Modal open onOpenChange={vi.fn()}>
        <p>Visible body</p>
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Visible body")).toBeInTheDocument();
  });

  it("locks the body scroll while open and restores it on unmount", () => {
    document.body.style.overflow = "auto";
    const { unmount } = render(
      <Modal open onOpenChange={vi.fn()}>
        <p>Body</p>
      </Modal>
    );
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("does not touch the body scroll while closed", () => {
    document.body.style.overflow = "visible";
    render(
      <Modal open={false} onOpenChange={vi.fn()}>
        <p>Body</p>
      </Modal>
    );
    expect(document.body.style.overflow).toBe("visible");
  });

  it("closes on Escape when closeOnEsc defaults to true", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onOpenChange={onOpenChange}>
        <p>Body</p>
      </Modal>
    );

    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("ignores other keys", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onOpenChange={onOpenChange}>
        <p>Body</p>
      </Modal>
    );

    await user.keyboard("{Enter}");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("does not close on Escape when closeOnEsc is false", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onOpenChange={onOpenChange} closeOnEsc={false}>
        <p>Body</p>
      </Modal>
    );

    await user.keyboard("{Escape}");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("closes when the overlay is clicked and closeOnOverlay defaults to true", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onOpenChange={onOpenChange}>
        <p>Body</p>
      </Modal>
    );

    const overlay = screen.getByRole("dialog").firstElementChild as HTMLElement;
    await user.click(overlay);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not bind an overlay handler when closeOnOverlay is false", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onOpenChange={onOpenChange} closeOnOverlay={false}>
        <p>Body</p>
      </Modal>
    );

    const overlay = screen.getByRole("dialog").firstElementChild as HTMLElement;
    await user.click(overlay);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  // FIXME: `ModalProps` declara `className?: string` pero el componente no lo
  // desestructura ni lo aplica al contenedor, así que la prop se descarta en
  // silencio. El test fija el comportamiento actual (la clase no llega al DOM).
  it("silently ignores the className prop (declared but never applied)", () => {
    render(
      <Modal open onOpenChange={vi.fn()} className="ignored-class">
        <p>Body</p>
      </Modal>
    );
    expect(screen.getByRole("dialog")).not.toHaveClass("ignored-class");
    expect(document.querySelector(".ignored-class")).toBeNull();
  });
});

describe("ModalContent", () => {
  it("renders its children with the base classes", () => {
    render(<ModalContent>Inner</ModalContent>);
    const content = screen.getByText("Inner");
    expect(content).toHaveClass("card", "relative", "w-full", "max-w-2xl", "bg-white");
  });

  it("merges a custom className", () => {
    render(<ModalContent className="content-extra">Inner</ModalContent>);
    expect(screen.getByText("Inner")).toHaveClass("content-extra", "card");
  });
});

describe("Modal layout primitives", () => {
  const primitives: Array<{
    name: string;
    Component: React.ElementType;
    tag: string;
    baseClasses: string[];
  }> = [
    { name: "ModalHeader", Component: ModalHeader, tag: "DIV", baseClasses: ["mb-5"] },
    {
      name: "ModalTitle",
      Component: ModalTitle,
      tag: "H2",
      baseClasses: ["text-2xl", "font-semibold", "tracking-tight"],
    },
    {
      name: "ModalDescription",
      Component: ModalDescription,
      tag: "P",
      baseClasses: ["mt-1", "text-gray-600"],
    },
    {
      name: "ModalFooter",
      Component: ModalFooter,
      tag: "DIV",
      baseClasses: ["mt-6", "flex", "items-center", "justify-end", "gap-3"],
    },
  ];

  it.each(primitives)(
    "$name renders a $tag with its base classes",
    ({ Component, tag, baseClasses }) => {
      render(<Component data-testid="node">content</Component>);
      const node = screen.getByTestId("node");
      expect(node.tagName).toBe(tag);
      expect(node).toHaveClass(...baseClasses);
    }
  );

  it.each(primitives)("$name merges a className and forwards props", ({ Component }) => {
    render(
      <Component data-testid="node" className="node-extra" id="node-id">
        content
      </Component>
    );
    const node = screen.getByTestId("node");
    expect(node).toHaveClass("node-extra");
    expect(node).toHaveAttribute("id", "node-id");
  });
});

describe("ModalCloseButton", () => {
  it("renders an accessible close button", () => {
    render(<ModalCloseButton />);
    const button = screen.getByRole("button", { name: "Close" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("absolute", "right-4", "top-4");
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<ModalCloseButton onClick={onClick} />);

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("merges a custom className and forwards extra props", () => {
    render(<ModalCloseButton className="close-extra" disabled />);
    const button = screen.getByRole("button", { name: "Close" });
    expect(button).toHaveClass("close-extra");
    expect(button).toBeDisabled();
  });
});
