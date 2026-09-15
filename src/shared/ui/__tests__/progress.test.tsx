import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Progress, ProgressRing } from "../progress";

describe("Progress", () => {
  it("exposes accessible values and clamps below zero", () => {
    render(<Progress value={-5} label="Upload progress" />);
    const progress = screen.getByRole("progressbar", {
      name: "Upload progress",
    });

    expect(progress).toHaveAttribute("aria-valuemin", "0");
    expect(progress).toHaveAttribute("aria-valuemax", "100");
    expect(progress).toHaveAttribute("aria-valuenow", "0");
    expect(progress.firstElementChild).toHaveStyle({ width: "0%" });
  });

  it("clamps above max and handles an invalid max", () => {
    const { rerender } = render(
      <Progress value={150} max={100} label="Generation progress" />
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100"
    );

    rerender(<Progress value={50} max={0} label="Generation progress" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuemax",
      "100"
    );
  });

  it("omits aria-valuenow while indeterminate", () => {
    render(<Progress value={null} label="Waiting" />);
    expect(screen.getByRole("progressbar")).not.toHaveAttribute(
      "aria-valuenow"
    );
  });
});

describe("ProgressRing", () => {
  it("uses circumference and offset math for the visible value", () => {
    render(
      <ProgressRing
        value={25}
        label="PDF progress"
        size={100}
        strokeWidth={10}
      />
    );

    const circle = screen.getByTestId("progress-ring-value");
    const circumference = 2 * Math.PI * 45;
    expect(Number(circle.getAttribute("stroke-dasharray"))).toBeCloseTo(
      circumference
    );
    expect(Number(circle.getAttribute("stroke-dashoffset"))).toBeCloseTo(
      circumference * 0.75
    );
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("is indeterminate without announcing a changing value", () => {
    render(
      <ProgressRing
        value={null}
        label="Downloading report"
        showValue={false}
      />
    );

    const progress = screen.getByRole("progressbar");
    expect(progress).not.toHaveAttribute("aria-valuenow");
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});
