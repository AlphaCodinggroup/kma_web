import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { Role } from "@entities/user/model/sessions";
vi.mock("@shared/ui/theme-toggle", () => ({ ThemeToggle: () => <button>Appearance</button> }));
import AppHeader from "../AppHeader";

describe("AppHeader", () => {
  it("renders the application identity and current workspace", () => {
    render(<AppHeader />);
    expect(screen.getByText("KMA")).toBeInTheDocument();
    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Appearance" })).toBeInTheDocument();
  });
  it("renders a custom location", () => {
    render(<AppHeader title="Dashboard" />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByLabelText("Current location")).toHaveTextContent("WorkspaceDashboard");
  });
  it("renders the header landmark", () => {
    render(<AppHeader />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });
  it("renders the user name when provided", () => {
    render(<AppHeader userName="Jane Doe" />);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });
  it.each([undefined, ""])("does not show an empty name (%s)", (userName) => {
    render(<AppHeader userName={userName} />);
    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
  });
  const roles: Role[] = ["administrator", "admin", "auditor", "viewer"];
  it.each(roles)("renders the %s role", (role) => {
    render(<AppHeader role={role} />);
    expect(screen.getByText(role)).toBeInTheDocument();
  });
  it("falls back to Guest when no role is given", () => {
    render(<AppHeader />);
    expect(screen.getByText("Guest")).toBeInTheDocument();
  });
});
