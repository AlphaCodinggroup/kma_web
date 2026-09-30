import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import TableHeader from "../table-header";

describe("TableHeader", () => {
  it("renders the title as a level 2 heading", () => {
    render(<TableHeader title="Users" />);

    const heading = screen.getByRole("heading", { level: 2, name: "Users" });
    expect(heading).toHaveClass("text-lg", "font-semibold", "text-black");
  });

  it("renders the subtitle joined with the total", () => {
    render(<TableHeader title="Users" subtitle="Total users" total={12} />);

    expect(screen.getByText("Total users: 12")).toBeInTheDocument();
  });

  // El total cero es un valor válido, no ausencia de dato.
  it("renders a zero total as a value", () => {
    render(<TableHeader title="Users" subtitle="Total users" total={0} />);

    expect(screen.getByText("Total users: 0")).toBeInTheDocument();
  });

  // Comportamiento actual documentado: sin subtitle ni total el párrafo queda
  // con el separador ":" solo.
  it("still renders the separator when subtitle and total are absent", () => {
    const { container } = render(<TableHeader title="Users" />);

    const paragraph = container.querySelector("p");
    expect(paragraph).not.toBeNull();
    expect(paragraph?.textContent).toBe(": ");
  });

  it("renders the action node when provided", () => {
    render(
      <TableHeader
        title="Users"
        action={<button type="button">Add user</button>}
      />
    );

    expect(screen.getByRole("button", { name: "Add user" })).toBeInTheDocument();
  });

  it("does not render an action wrapper when no action is given", () => {
    const { container } = render(<TableHeader title="Users" />);

    // Sólo el wrapper del título dentro del contenedor raíz.
    expect(container.firstElementChild?.children).toHaveLength(1);
  });
});
