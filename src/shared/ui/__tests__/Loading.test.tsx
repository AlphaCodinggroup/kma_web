import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Loading } from "../Loading";

describe("Loading", () => {
  it("renders the spinner element", () => {
    const { container } = render(<Loading />);
    // The spinner is a div with animate-spin class
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("renders without text when no text prop is provided", () => {
    const { container } = render(<Loading />);
    const paragraph = container.querySelector("p");
    expect(paragraph).toBeNull();
  });

  it("renders the text when a text prop is provided", () => {
    render(<Loading text="Loading data..." />);
    expect(screen.getByText("Loading data...")).toBeInTheDocument();
  });
});
