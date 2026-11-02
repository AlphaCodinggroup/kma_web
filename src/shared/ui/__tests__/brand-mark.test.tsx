import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandMark } from "../brand-mark";

describe("BrandMark", () => {
  it("exposes the logo as an image named KMA", () => {
    render(<BrandMark />);
    expect(screen.getByRole("img", { name: "KMA" })).toBeInTheDocument();
  });

  it("gives every instance its own clip path so a hidden copy cannot break another", () => {
    const { container } = render(<><BrandMark /><BrandMark className="lg:hidden" /></>);
    const ids = Array.from(container.querySelectorAll("clipPath")).map(node => node.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    container.querySelectorAll("g").forEach((group, index) => expect(group.getAttribute("clip-path")).toBe(`url(#${ids[index]})`));
  });

  it("paints the brand red from the shared token and accepts a size override", () => {
    const { container } = render(<BrandMark className="h-6 w-6" />);
    expect(container.querySelector("circle")).toHaveAttribute("fill", "var(--ks-brand-red)");
    expect(container.querySelector("svg")).toHaveClass("h-6", "w-6");
  });
});
