import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import type { Role } from "@entities/user/model/sessions";
import AppHeader from "../AppHeader";

describe("AppHeader", () => {
  it("renders the default application title", () => {
    render(<AppHeader />);

    expect(screen.getByText("KMApp Web Application")).toBeInTheDocument();
  });

  it("renders a custom title", () => {
    render(<AppHeader title="Dashboard" />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("KMApp Web Application")).not.toBeInTheDocument();
  });

  it("renders a sticky header landmark", () => {
    render(<AppHeader />);

    const header = screen.getByRole("banner");
    expect(header).toHaveClass("sticky", "top-0", "h-16", "bg-white");
  });

  it("renders the user name when provided", () => {
    render(<AppHeader userName="Jane Doe" />);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("omits the user name when it is not provided", () => {
    const { container } = render(<AppHeader />);

    expect(container.querySelectorAll("span")).toHaveLength(1);
  });

  // Un nombre vacío no debe dejar un span vacío en el menú de usuario.
  it("omits the user name when it is an empty string", () => {
    const { container } = render(<AppHeader userName="" />);

    expect(container.querySelectorAll("span")).toHaveLength(1);
  });

  const roleCases: Array<{ role: Role; expected: string }> = [
    { role: "administrator", expected: "administrator" },
    { role: "admin", expected: "admin" },
    { role: "auditor", expected: "auditor" },
    { role: "viewer", expected: "viewer" },
  ];

  it.each(roleCases)("renders the $role role pill", ({ role, expected }) => {
    render(<AppHeader role={role} />);

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("falls back to Guest when no role is given", () => {
    render(<AppHeader />);

    expect(screen.getByText("Guest")).toBeInTheDocument();
  });

  it("styles the role pill as a rounded badge", () => {
    render(<AppHeader role="admin" />);

    expect(screen.getByText("admin")).toHaveClass(
      "inline-flex",
      "rounded-full",
      "bg-gray-100",
      "text-xs",
      "font-bold"
    );
  });

  it("renders name and role together", () => {
    render(<AppHeader userName="Jane Doe" role="auditor" title="Reports" />);

    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("auditor")).toBeInTheDocument();
  });
});
