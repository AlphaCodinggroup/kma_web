import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../dropdown-menu";

function Fixture({ onSelect }: { onSelect: () => void }) {
  return <DropdownMenu><DropdownMenuTrigger asChild><button>More actions</button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem>First action</DropdownMenuItem><DropdownMenuItem disabled>Unavailable action</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={onSelect}>Last action</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}

describe("menu keyboard behavior", () => {
  it("skips unavailable actions and restores focus after selection", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Fixture onSelect={onSelect} />);
    const trigger = screen.getByRole("button", { name: "More actions" });
    trigger.focus();
    await user.keyboard("{ArrowDown}");
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "First action" })).toHaveFocus());
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Last action" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("closes with Escape without executing an action", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Fixture onSelect={onSelect} />);
    const trigger = screen.getByRole("button", { name: "More actions" });
    trigger.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("menu")).toBeVisible();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    expect(onSelect).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });
});
