import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/users",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("@shared/ui/theme-toggle", () => ({ ThemeToggle: () => <button>Appearance</button> }));
vi.mock("@features/auth/lib/usecases/login", () => ({ logout: vi.fn() }));
import AppShell from "../AppShell";

describe("AppShell breadcrumb", () => {
  it("names the users section like its menu entry", () => {
    render(<AppShell role="admin"><h1>Users content</h1></AppShell>);
    const location = screen.getByLabelText("Current location");
    expect(within(location).getByText("User Management")).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: "User Management" })).getByText("User Management")).toBeInTheDocument();
  });
});
