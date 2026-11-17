import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import ReportsSearchCard from "../ReportsSearchCard";

describe("ReportsSearchCard", () => {
  it("names the search region", () => {
    render(<ReportsSearchCard query="" onQueryChange={vi.fn()} />);

    expect(
      screen.getByRole("region", { name: "Search reports" })
    ).toBeInTheDocument();
  });

  it("renders the search input with the current query", () => {
    render(<ReportsSearchCard query="plant" onQueryChange={vi.fn()} />);

    const input = screen.getByRole("searchbox");
    expect(input).toHaveValue("plant");
  });

  it("uses the domain default placeholder", () => {
    render(<ReportsSearchCard query="" onQueryChange={vi.fn()} />);

    expect(screen.getByRole("searchbox")).toHaveAttribute(
      "placeholder",
      "Search by project name, status, or date…"
    );
  });

  it("honours a custom placeholder", () => {
    render(
      <ReportsSearchCard
        query=""
        onQueryChange={vi.fn()}
        placeholder="Find a report"
      />
    );

    expect(screen.getByRole("searchbox")).toHaveAttribute(
      "placeholder",
      "Find a report"
    );
  });

  it("reports every keystroke through onQueryChange", async () => {
    const onQueryChange = vi.fn();
    const user = userEvent.setup();
    render(<ReportsSearchCard query="" onQueryChange={onQueryChange} />);

    await user.type(screen.getByRole("searchbox"), "ab");

    // Componente controlado: cada tecla parte del mismo valor vacío.
    expect(onQueryChange).toHaveBeenCalledTimes(2);
    expect(onQueryChange).toHaveBeenNthCalledWith(1, "a");
    expect(onQueryChange).toHaveBeenNthCalledWith(2, "b");
  });

  it("preserves a caller custom className", () => {
    const { container } = render(
      <ReportsSearchCard
        query=""
        onQueryChange={vi.fn()}
        className="card-extra"
      />
    );

    expect(container.firstElementChild).toHaveClass("card-extra");
  });

  // El rightSlot está declarado en las props pero el componente no lo consume.
  // FIXME: `rightSlot` se acepta y se descarta; el nodo nunca se renderiza.
  it("ignores the rightSlot prop", () => {
    render(
      <ReportsSearchCard
        query=""
        onQueryChange={vi.fn()}
        rightSlot={<button type="button">Generate</button>}
      />
    );

    expect(
      screen.queryByRole("button", { name: "Generate" })
    ).not.toBeInTheDocument();
  });
});
