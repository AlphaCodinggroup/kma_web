import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/dashboard" as string | null,
  push: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh, prefetch: mocks.prefetch }),
}));
vi.mock("@features/auth/lib/usecases/login", () => ({ logout: mocks.logout }));

import { FileText } from "lucide-react";
import type { Route } from "next";
import AppHeader from "./AppHeader";
import SidebarNav, { type NavItem } from "./SidebarNav";

describe("shell widgets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = "/dashboard";
    mocks.logout.mockResolvedValue(undefined);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders header defaults and explicit identity", () => {
    const { rerender } = render(<AppHeader />);
    expect(screen.getByText("KMApp Web Application")).toBeInTheDocument();
    expect(screen.getByText("Guest")).toBeInTheDocument();

    rerender(<AppHeader title="KMA" role="auditor" userName="Alice" />);
    expect(screen.getByText("KMA")).toBeInTheDocument();
    expect(screen.getByText("auditor")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it.each(["admin", "administrator"] as const)("shows user management to %s", (role) => {
    render(<SidebarNav role={role} />);
    expect(screen.getByRole("link", { name: "User Management" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
  });

  it.each([undefined, "viewer", "auditor"] as const)("hides user management from %s", (role) => {
    render(<SidebarNav role={role} />);
    expect(screen.queryByRole("link", { name: "User Management" })).not.toBeInTheDocument();
  });

  it("filters hidden items and marks exact and nested routes active", () => {
    const items: NavItem[] = [
      { label: "Audits", href: "/audits" as Route, icon: FileText },
      { label: "Hidden", href: "/hidden" as Route, icon: FileText, hidden: true },
    ];
    mocks.pathname = "/audits/audit-1/edit";
    const { rerender } = render(<SidebarNav items={items} widthClassName="w-test" role="viewer" />);
    expect(screen.getByRole("complementary", { name: "Primary" })).toHaveClass("w-test");
    expect(screen.getByRole("link", { name: "Audits" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();

    mocks.pathname = null;
    rerender(<SidebarNav items={items} role="viewer" />);
    expect(screen.getByRole("link", { name: "Audits" })).not.toHaveAttribute("aria-current");
  });

  it("prefetches on hover and blocks duplicate navigation while a route changes", async () => {
    const user = userEvent.setup();
    render(<SidebarNav role="admin" />);
    const audits = screen.getByRole("link", { name: "Audits" });
    await user.hover(audits);
    expect(mocks.prefetch).toHaveBeenCalledWith("/audits");
    await user.click(audits);
    expect(audits).toHaveClass("pointer-events-none");
    expect(screen.getByRole("link", { name: "Reports" })).toHaveClass("pointer-events-none");

    const dashboard = screen.getByRole("link", { name: "Dashboard" });
    await user.click(dashboard);
    expect(dashboard).toHaveAttribute("aria-current", "page");
  });

  it("logs out, redirects and refreshes", async () => {
    const user = userEvent.setup();
    render(<SidebarNav role="admin" />);
    await user.click(screen.getByRole("button", { name: "Logout" }));
    await waitFor(() => expect(mocks.logout).toHaveBeenCalledOnce());
    expect(mocks.push).toHaveBeenCalledWith("/login");
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Logout" })).toBeEnabled();
  });

  it("prevents repeated logout while pending and recovers from errors", async () => {
    const user = userEvent.setup();
    let rejectLogout: (error: Error) => void = () => undefined;
    mocks.logout.mockReturnValue(new Promise((_, reject) => { rejectLogout = reject; }));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<SidebarNav role="admin" />);
    const button = screen.getByRole("button", { name: "Logout" });
    await user.click(button);
    expect(button).toBeDisabled();
    rejectLogout(new Error("offline"));
    await waitFor(() => expect(button).toBeEnabled());
    expect(console.error).toHaveBeenCalledWith("[SidebarNav] logout failed", expect.any(Error));
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
