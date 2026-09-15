import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Users } from "lucide-react";
import type { Role } from "@entities/user/model/sessions";

const pathnameMock = vi.fn<() => string | null>(() => "/dashboard");
const pushMock = vi.fn();
const refreshMock = vi.fn();
const prefetchMock = vi.fn();
const logoutMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
    prefetch: prefetchMock,
  }),
}));

// Link se reemplaza por un ancla simple: el widget sólo necesita href y eventos.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    prefetch: _prefetch,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    prefetch?: boolean;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@features/auth/lib/usecases/login", () => ({
  logout: (...args: unknown[]) => logoutMock(...args),
}));

import SidebarNav, { type NavItem } from "../SidebarNav";

const DEFAULT_LABELS = [
  "Dashboard",
  "Audits",
  "Reports",
  "Flows",
  "Projects & Facilities",
];

describe("SidebarNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pathnameMock.mockReturnValue("/dashboard");
    logoutMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the primary navigation landmark", () => {
    render(<SidebarNav />);

    expect(screen.getByRole("complementary", { name: "Primary" })).toBeInTheDocument();
  });

  it("renders every non admin navigation item by default", () => {
    render(<SidebarNav />);

    for (const label of DEFAULT_LABELS) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  const defaultHrefs: Array<{ label: string; href: string }> = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Audits", href: "/audits" },
    { label: "Reports", href: "/reports" },
    { label: "Flows", href: "/flows" },
    { label: "Projects & Facilities", href: "/projects" },
  ];

  it.each(defaultHrefs)("points $label to $href", ({ label, href }) => {
    render(<SidebarNav />);

    expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
  });

  // ---------------------------------------------------------------------------
  // Item activo según usePathname
  // ---------------------------------------------------------------------------

  it("marks the item matching the pathname exactly as the current page", () => {
    pathnameMock.mockReturnValue("/reports");
    render(<SidebarNav />);

    const active = screen.getByRole("link", { name: "Reports" });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active).toHaveClass("bg-black", "text-white");
  });

  it("marks the section item as active for a nested route", () => {
    pathnameMock.mockReturnValue("/audits/123/detail");
    render(<SidebarNav />);

    expect(screen.getByRole("link", { name: "Audits" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("does not mark inactive items", () => {
    pathnameMock.mockReturnValue("/reports");
    render(<SidebarNav />);

    const inactive = screen.getByRole("link", { name: "Dashboard" });
    expect(inactive).not.toHaveAttribute("aria-current");
    expect(inactive).toHaveClass("text-gray-700");
  });

  // Un prefijo parcial (/report) no debe activar /reports.
  it("does not activate an item on a partial prefix match", () => {
    pathnameMock.mockReturnValue("/reportsomething");
    render(<SidebarNav />);

    expect(
      screen.getByRole("link", { name: "Reports" })
    ).not.toHaveAttribute("aria-current");
  });

  it("marks nothing as active when there is no pathname", () => {
    pathnameMock.mockReturnValue(null);
    render(<SidebarNav />);

    for (const label of DEFAULT_LABELS) {
      expect(screen.getByRole("link", { name: label })).not.toHaveAttribute(
        "aria-current"
      );
    }
  });

  // ---------------------------------------------------------------------------
  // Secciones de administración según rol
  // ---------------------------------------------------------------------------

  const adminRoles: Role[] = ["admin", "administrator"];

  it.each(adminRoles)("shows User Management for the %s role", (role) => {
    render(<SidebarNav role={role} />);

    expect(
      screen.getByRole("link", { name: "User Management" })
    ).toBeInTheDocument();
  });

  const nonAdminRoles: Role[] = ["auditor", "viewer"];

  it.each(nonAdminRoles)("hides User Management for the %s role", (role) => {
    render(<SidebarNav role={role} />);

    expect(
      screen.queryByRole("link", { name: "User Management" })
    ).not.toBeInTheDocument();
    // El resto de la navegación sigue disponible.
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("hides User Management when no role is given", () => {
    render(<SidebarNav />);

    expect(
      screen.queryByRole("link", { name: "User Management" })
    ).not.toBeInTheDocument();
  });

  it("accepts an uppercase admin role", () => {
    render(<SidebarNav role={"ADMIN" as Role} />);

    expect(
      screen.getByRole("link", { name: "User Management" })
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Items personalizados
  // ---------------------------------------------------------------------------

  it("renders a custom item list", () => {
    const items: NavItem[] = [
      { label: "Only one", href: "/only" as NavItem["href"], icon: Users },
    ];
    render(<SidebarNav items={items} />);

    expect(screen.getByRole("link", { name: "Only one" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  it("skips items flagged as hidden", () => {
    const items: NavItem[] = [
      { label: "Visible", href: "/visible" as NavItem["href"], icon: Users },
      {
        label: "Invisible",
        href: "/invisible" as NavItem["href"],
        icon: Users,
        hidden: true,
      },
    ];
    render(<SidebarNav items={items} />);

    expect(screen.getByRole("link", { name: "Visible" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Invisible" })).not.toBeInTheDocument();
  });

  it("uses the default width class and honours an override", () => {
    const { unmount } = render(<SidebarNav />);
    expect(screen.getByRole("complementary")).toHaveClass("w-65");
    unmount();

    render(<SidebarNav widthClassName="w-80" />);
    expect(screen.getByRole("complementary")).toHaveClass("w-80");
  });

  // ---------------------------------------------------------------------------
  // Navegación y prefetch
  // ---------------------------------------------------------------------------

  it("prefetches a route on hover", async () => {
    const user = userEvent.setup();
    render(<SidebarNav />);

    await user.hover(screen.getByRole("link", { name: "Reports" }));

    expect(prefetchMock).toHaveBeenCalledWith("/reports");
  });

  it("shows the spinner on the item being navigated to", async () => {
    const user = userEvent.setup();
    render(<SidebarNav />);

    const target = screen.getByRole("link", { name: "Reports" });
    await user.click(target);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Reports" })).toHaveClass(
        "pointer-events-none"
      );
    });
    // Mientras hay navegación en curso el resto también queda bloqueado.
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveClass(
      "pointer-events-none"
    );
  });

  it("does not flag a navigation when clicking the current item", async () => {
    pathnameMock.mockReturnValue("/dashboard");
    const user = userEvent.setup();
    render(<SidebarNav />);

    await user.click(screen.getByRole("link", { name: "Dashboard" }));

    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveClass(
      "pointer-events-none"
    );
  });

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  it("renders the logout button enabled", () => {
    render(<SidebarNav />);

    expect(screen.getByRole("button", { name: "Logout" })).toBeEnabled();
  });

  it("logs out and redirects to the login page", async () => {
    const user = userEvent.setup();
    render(<SidebarNav />);

    await user.click(screen.getByRole("button", { name: "Logout" }));

    await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1));
    expect(pushMock).toHaveBeenCalledWith("/login");
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("logs the failure and re-enables the button when logout rejects", async () => {
    const error = new Error("network down");
    logoutMock.mockRejectedValue(error);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(<SidebarNav />);

    await user.click(screen.getByRole("button", { name: "Logout" }));

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith("[SidebarNav] logout failed", error)
    );
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Logout" })).toBeEnabled();
  });

  it("keeps the logout button disabled while signing out", async () => {
    let resolveLogout: (() => void) | undefined;
    logoutMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveLogout = resolve;
        })
    );
    const user = userEvent.setup();
    render(<SidebarNav />);

    await user.click(screen.getByRole("button", { name: "Logout" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Logout" })).toBeDisabled()
    );

    resolveLogout?.();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Logout" })).toBeEnabled()
    );
  });

  it("clears the navigating flag when the pathname changes", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SidebarNav />);

    await user.click(screen.getByRole("link", { name: "Reports" }));
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Reports" })).toHaveClass(
        "pointer-events-none"
      )
    );

    pathnameMock.mockReturnValue("/reports");
    rerender(<SidebarNav />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Reports" })).not.toHaveClass(
        "pointer-events-none"
      )
    );
  });
});
