import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Trash2 } from "lucide-react";
import PageHeader from "../page-header";

describe("PageHeader", () => {
  it("renders the title as a level 1 heading", () => {
    render(<PageHeader title="User Management" />);

    const heading = screen.getByRole("heading", {
      level: 1,
      name: "User Management",
    });
    expect(heading).toHaveClass("truncate", "text-2xl", "font-semibold");
  });

  it("renders the subtitle when provided", () => {
    render(<PageHeader title="Users" subtitle="Manage system users" />);

    const subtitle = screen.getByText("Manage system users");
    expect(subtitle.tagName).toBe("P");
    expect(subtitle).toHaveClass("mt-1", "text-sm", "text-gray-600");
  });

  it("omits the subtitle paragraph when not provided", () => {
    const { container } = render(<PageHeader title="Users" />);

    expect(container.querySelector("p")).toBeNull();
  });

  const alignCases: Array<{
    verticalAlign: "start" | "center" | "end" | undefined;
    expected: string;
  }> = [
    { verticalAlign: "start", expected: "items-start" },
    { verticalAlign: "center", expected: "items-center" },
    { verticalAlign: "end", expected: "items-end" },
    { verticalAlign: undefined, expected: "items-center" },
  ];

  it.each(alignCases)(
    "applies $expected when verticalAlign is $verticalAlign",
    ({ verticalAlign, expected }) => {
      const { container } = render(
        <PageHeader
          title="Users"
          {...(verticalAlign !== undefined ? { verticalAlign } : {})}
        />
      );

      expect(container.firstElementChild).toHaveClass(expected, "flex");
    }
  );

  it("merges the root, title and subtitle classNames", () => {
    const { container } = render(
      <PageHeader
        title="Users"
        subtitle="Subtitle"
        className="root-extra"
        titleClassName="title-extra"
        subtitleClassName="subtitle-extra"
      />
    );

    expect(container.firstElementChild).toHaveClass("root-extra");
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("title-extra");
    expect(screen.getByText("Subtitle")).toHaveClass("subtitle-extra");
  });

  it("renders the primary action with the default plus icon", () => {
    const { container } = render(
      <PageHeader
        title="Users"
        primaryAction={{ label: "Add User", onClick: vi.fn() }}
      />
    );

    expect(screen.getByRole("button", { name: "Add User" })).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("calls the primary action onClick", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <PageHeader title="Users" primaryAction={{ label: "Add User", onClick }} />
    );

    await user.click(screen.getByRole("button", { name: "Add User" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("uses the icon supplied by the primary action", () => {
    render(
      <PageHeader
        title="Users"
        primaryAction={{
          label: "Delete all",
          onClick: vi.fn(),
          icon: Trash2,
        }}
      />
    );

    expect(
      screen.getByRole("button", { name: "Delete all" })
    ).toBeInTheDocument();
  });

  it("forwards the data-testid of the primary action", () => {
    render(
      <PageHeader
        title="Users"
        primaryAction={{
          label: "Add User",
          onClick: vi.fn(),
          "data-testid": "add-user",
        }}
      />
    );

    expect(screen.getByTestId("add-user")).toHaveAccessibleName("Add User");
  });

  it("renders the actionSlot when provided", () => {
    render(
      <PageHeader
        title="Users"
        actionSlot={<button type="button">Custom slot</button>}
      />
    );

    expect(
      screen.getByRole("button", { name: "Custom slot" })
    ).toBeInTheDocument();
  });

  // El slot gana: si hay actionSlot, la primaryAction no se renderiza.
  it("prefers the actionSlot over the primaryAction", () => {
    render(
      <PageHeader
        title="Users"
        actionSlot={<button type="button">Custom slot</button>}
        primaryAction={{ label: "Add User", onClick: vi.fn() }}
      />
    );

    expect(
      screen.getByRole("button", { name: "Custom slot" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add User" })
    ).not.toBeInTheDocument();
  });

  it("renders no action at all when neither slot nor primaryAction are given", () => {
    render(<PageHeader title="Users" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("accepts React nodes as title and subtitle", () => {
    render(
      <PageHeader
        title={<span data-testid="node-title">Nodes</span>}
        subtitle={<span data-testid="node-subtitle">Subtitle node</span>}
      />
    );

    expect(screen.getByTestId("node-title")).toHaveTextContent("Nodes");
    expect(screen.getByTestId("node-subtitle")).toHaveTextContent(
      "Subtitle node"
    );
  });
});
