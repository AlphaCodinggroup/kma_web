import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../card";

describe("Card primitives", () => {
  it("renders the whole composition with every slot", () => {
    render(
      <Card data-testid="card">
        <CardHeader data-testid="header">
          <CardTitle>Card title</CardTitle>
          <CardDescription>Card description</CardDescription>
        </CardHeader>
        <CardContent data-testid="content">Body</CardContent>
        <CardFooter data-testid="footer">Footer</CardFooter>
      </Card>
    );

    expect(screen.getByTestId("card")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Card title" })
    ).toBeInTheDocument();
    expect(screen.getByText("Card description")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  // Cada primitivo: etiqueta HTML esperada y clases base.
  const primitives: Array<{
    name: string;
    Component: React.ElementType;
    tag: string;
    baseClasses: string[];
  }> = [
    {
      name: "Card",
      Component: Card,
      tag: "DIV",
      baseClasses: ["rounded-2xl", "border", "border-gray-200", "bg-white", "shadow-sm"],
    },
    { name: "CardHeader", Component: CardHeader, tag: "DIV", baseClasses: ["px-5", "pt-5"] },
    {
      name: "CardTitle",
      Component: CardTitle,
      tag: "H3",
      baseClasses: ["text-sm", "font-semibold", "leading-none", "tracking-tight"],
    },
    {
      name: "CardDescription",
      Component: CardDescription,
      tag: "P",
      baseClasses: ["text-xs", "text-gray-500"],
    },
    { name: "CardContent", Component: CardContent, tag: "DIV", baseClasses: ["px-5", "pb-5"] },
    {
      name: "CardFooter",
      Component: CardFooter,
      tag: "DIV",
      baseClasses: ["px-5", "pb-5", "pt-0", "flex", "items-center"],
    },
  ];

  it.each(primitives)(
    "$name renders a $tag with its base classes",
    ({ Component, tag, baseClasses }) => {
      render(<Component data-testid="node">content</Component>);
      const node = screen.getByTestId("node");
      expect(node.tagName).toBe(tag);
      expect(node).toHaveClass(...baseClasses);
    }
  );

  it.each(primitives)("$name merges a custom className", ({ Component }) => {
    render(
      <Component data-testid="node" className="my-extra-class">
        content
      </Component>
    );
    expect(screen.getByTestId("node")).toHaveClass("my-extra-class");
  });

  it.each(primitives)("$name forwards extra DOM props", ({ Component }) => {
    render(
      <Component data-testid="node" id="node-id" title="node title">
        content
      </Component>
    );
    const node = screen.getByTestId("node");
    expect(node).toHaveAttribute("id", "node-id");
    expect(node).toHaveAttribute("title", "node title");
  });

  it.each(primitives)("$name forwards its ref", ({ Component }) => {
    const ref = React.createRef<HTMLElement>();
    render(
      <Component ref={ref} data-testid="node">
        content
      </Component>
    );
    expect(ref.current).not.toBeNull();
    expect(ref.current).toBe(screen.getByTestId("node"));
  });

  it.each(primitives)("$name exposes its displayName", ({ name, Component }) => {
    expect((Component as { displayName?: string }).displayName).toBe(name);
  });
});
