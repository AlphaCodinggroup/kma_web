import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import UsersSearchCard from "../UsersSearchCard";

describe("UsersSearchCard", () => {
  it("renders the section header with the total", () => {
    render(
      <UsersSearchCard query="" onQueryChange={vi.fn()} total={7} />
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Managements" })
    ).toBeInTheDocument();
    expect(screen.getByText("Total Managements: 7")).toBeInTheDocument();
  });

  // Total en cero es dato válido, no ausencia.
  it("renders a zero total", () => {
    render(
      <UsersSearchCard query="" onQueryChange={vi.fn()} total={0} />
    );

    expect(screen.getByText("Total Managements: 0")).toBeInTheDocument();
  });

  it("renders the labelled search input with the current query", () => {
    render(
      <UsersSearchCard query="jane" onQueryChange={vi.fn()} total={1} />
    );

    const input = screen.getByLabelText("Search Managements");
    expect(input).toHaveValue("jane");
    expect(input).toHaveAttribute("type", "search");
  });

  it("uses the default search placeholder when none is given", () => {
    render(<UsersSearchCard query="" onQueryChange={vi.fn()} total={0} />);

    expect(screen.getByLabelText("Search Managements")).toHaveAttribute(
      "placeholder",
      "Search…"
    );
  });

  it("honours a custom placeholder", () => {
    render(
      <UsersSearchCard
        query=""
        onQueryChange={vi.fn()}
        total={0}
        placeholder="Search a user"
      />
    );

    expect(screen.getByLabelText("Search Managements")).toHaveAttribute(
      "placeholder",
      "Search a user"
    );
  });

  it("reports every keystroke through onQueryChange", async () => {
    const onQueryChange = vi.fn();
    const user = userEvent.setup();
    render(
      <UsersSearchCard query="" onQueryChange={onQueryChange} total={0} />
    );

    await user.type(screen.getByLabelText("Search Managements"), "ab");

    // El componente es controlado: cada tecla parte del mismo valor vacío.
    expect(onQueryChange).toHaveBeenCalledTimes(2);
    expect(onQueryChange).toHaveBeenNthCalledWith(1, "a");
    expect(onQueryChange).toHaveBeenNthCalledWith(2, "b");
  });

  it("renders its children below the search input", () => {
    render(
      <UsersSearchCard query="" onQueryChange={vi.fn()} total={0}>
        <div data-testid="table-slot">table</div>
      </UsersSearchCard>
    );

    expect(screen.getByTestId("table-slot")).toBeInTheDocument();
  });

  it("applies the card base classes and merges a custom className", () => {
    const { container } = render(
      <UsersSearchCard
        query=""
        onQueryChange={vi.fn()}
        total={0}
        className="card-extra"
      />
    );

    expect(container.firstElementChild).toHaveClass(
      "rounded-2xl",
      "border",
      "bg-white",
      "card-extra"
    );
  });
});
