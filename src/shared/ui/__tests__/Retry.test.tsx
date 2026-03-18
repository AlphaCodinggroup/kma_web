import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Retry } from "../Retry";

describe("Retry", () => {
  it("renders the error message text", () => {
    render(<Retry text="Something went wrong" onClick={vi.fn()} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders a retry button with default label", () => {
    render(<Retry text="Error" onClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("renders a retry button with custom label", () => {
    render(<Retry text="Error" textButton="Try again" onClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("calls onClick when the retry button is clicked", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<Retry text="Error" onClick={handleClick} />);

    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
