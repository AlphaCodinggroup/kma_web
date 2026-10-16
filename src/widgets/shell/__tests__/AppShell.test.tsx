import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("@shared/ui/theme-toggle", () => ({ ThemeToggle: () => <button>Appearance</button> }));
vi.mock("@features/auth/lib/usecases/login", () => ({ logout: vi.fn() }));
import AppShell from "../AppShell";

describe("AppShell mobile navigation", () => {
  it("opens an accessible drawer, then restores focus when Escape closes it", async () => {
    const user = userEvent.setup();
    render(<AppShell role="auditor"><h1>Dashboard content</h1></AppShell>);
    const trigger = screen.getByRole("button", { name: "Open navigation" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Navigation" });
    expect(within(dialog).getByRole("link", { name: "Facilities" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("link", { name: "User Management" })).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("keeps keyboard focus in the drawer and closes from its explicit button", async () => {
    const user = userEvent.setup();
    render(<AppShell role="admin"><h1>Dashboard content</h1></AppShell>);
    const trigger = screen.getByRole("button", { name: "Open navigation" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Navigation" });
    const close = within(dialog).getByRole("button", { name: "Close navigation" });
    close.focus();
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(within(dialog).getByRole("button", { name: "Logout" })).toHaveFocus();
    await user.keyboard("{Tab}");
    expect(close).toHaveFocus();
    await user.click(close);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes the drawer after choosing a destination", async () => {
    const user = userEvent.setup();
    render(<AppShell role="admin"><h1>Dashboard content</h1></AppShell>);
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const dialog = screen.getByRole("dialog", { name: "Navigation" });
    await user.click(within(dialog).getByRole("link", { name: "Reports" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("main")).toHaveTextContent("Dashboard content");
  });
});
