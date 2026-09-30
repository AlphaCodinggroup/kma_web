import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MetricCard, { type MetricCardProps } from "../MetricCard";

type IconKey = NonNullable<MetricCardProps["icon"]>;

describe("MetricCard", () => {
  it("renders the title and the value", () => {
    render(<MetricCard title="Total Audits" value={42} />);

    expect(
      screen.getByRole("heading", { level: 3, name: "Total Audits" })
    ).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  // El cero es un valor válido, no ausencia de dato: debe renderizarse.
  it("renders a zero value instead of hiding it", () => {
    render(<MetricCard title="Pending" value={0} />);

    const value = screen.getByText("0");
    expect(value).toBeInTheDocument();
    expect(value).toHaveClass("text-3xl", "font-bold");
  });

  it("renders an empty string value without breaking", () => {
    const { container } = render(<MetricCard title="Empty" value="" />);

    const valueNode = container.querySelector(".text-3xl");
    expect(valueNode).not.toBeNull();
    expect(valueNode?.textContent).toBe("");
  });

  it("renders a preformatted string value verbatim", () => {
    render(<MetricCard title="Revenue" value="1,234" />);

    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("renders a React node as the value", () => {
    render(
      <MetricCard
        title="Custom"
        value={<span data-testid="custom-value">n/a</span>}
      />
    );

    expect(screen.getByTestId("custom-value")).toHaveTextContent("n/a");
  });

  it("renders the subtitle when provided", () => {
    render(<MetricCard title="Audits" value={3} subtitle="Last 30 days" />);

    const subtitle = screen.getByText("Last 30 days");
    expect(subtitle).toHaveClass("mt-1", "text-xs", "text-gray-600");
  });

  const absentSubtitles: Array<{ label: string; subtitle: string | undefined }> = [
    { label: "undefined", subtitle: undefined },
    { label: "an empty string", subtitle: "" },
  ];

  it.each(absentSubtitles)(
    "omits the subtitle node when it is $label",
    ({ subtitle }) => {
      const { container } = render(
        <MetricCard
          title="Audits"
          value={3}
          {...(subtitle !== undefined ? { subtitle } : {})}
        />
      );

      expect(container.querySelector(".text-gray-600")).toBeNull();
    }
  );

  const iconKeys: IconKey[] = [
    "file-text",
    "bar-chart-3",
    "check-circle-2",
    "user-plus",
    "shield-check",
    "badge-check",
    "brief-case",
    "building",
    "alert-circle",
    "file-check",
    "clock",
    "eye",
    "send",
  ];

  it.each(iconKeys)("renders the %s icon as decorative", (icon) => {
    const { container } = render(
      <MetricCard title="Metric" value={1} icon={icon} />
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveClass("h-4", "w-4", "text-gray-600");
  });

  it("renders no icon when the icon key is omitted", () => {
    const { container } = render(<MetricCard title="Metric" value={1} />);

    expect(container.querySelector("svg")).toBeNull();
  });

  it("forwards the data-testid to the card root", () => {
    render(
      <MetricCard title="Metric" value={1} data-testid="metric-total" />
    );

    expect(screen.getByTestId("metric-total")).toHaveClass(
      "rounded-2xl",
      "bg-white"
    );
  });

  it("renders the card without a data-testid", () => {
    const { container } = render(<MetricCard title="Metric" value={1} />);

    expect(container.firstElementChild).not.toHaveAttribute("data-testid");
  });
});
