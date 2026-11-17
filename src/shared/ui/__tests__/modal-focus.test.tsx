import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Modal, ModalContent, ModalTitle } from "../modal";

function Example() {
  const [open, setOpen] = useState(false);
  return <><button onClick={() => setOpen(true)}>Open form</button><Modal open={open} onOpenChange={setOpen}><ModalContent><ModalTitle>Edit project</ModalTitle><input aria-label="Project name" /><button onClick={() => setOpen(false)}>Cancel</button></ModalContent></Modal></>;
}

describe("Modal keyboard access", () => {
  it("names the dialog, traps focus, and returns it to the opener", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const opener = screen.getByRole("button", { name: "Open form" });
    await user.click(opener);
    expect(screen.getByRole("dialog", { name: "Edit project" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveFocus());
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("textbox")).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(opener).toHaveFocus());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
