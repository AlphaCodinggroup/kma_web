import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Loading } from "../Loading";

describe("Loading", () => {
  it("announces section loading without replacing surrounding content", () => {
    render(<main><h1>Projects</h1><Loading /></main>);
    expect(screen.getByRole("heading", { name: "Projects" })).toBeVisible();
    expect(screen.getByRole("status", { name: "Loading" })).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Loading…")).toBeVisible();
  });
  it("announces the operation being loaded", () => {
    render(<Loading text="Loading data..." />);
    expect(screen.getByRole("status", { name: "Loading data..." })).toBeVisible();
  });
});
