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
      screen.getByRole("heading", { level: 2, name: "Team directory" })
    ).toBeInTheDocument();
    expect(screen.getByText("Total users: 7")).toBeInTheDocument();
  });

  // Total en cero es dato válido, no ausencia.
  it("renders a zero total", () => {
    render(
      <UsersSearchCard query="" onQueryChange={vi.fn()} total={0} />
    );

    expect(screen.getByText("Total users: 0")).toBeInTheDocument();
  });

  it("renders the labelled search input with the current query", () => {
    render(
      <UsersSearchCard query="jane" onQueryChange={vi.fn()} total={1} />
    );

    const input = screen.getByLabelText("Search users");
    expect(input).toHaveValue("jane");
    expect(input).toHaveAttribute("type", "search");
  });

  it("uses the default search placeholder when none is given", () => {
    render(<UsersSearchCard query="" onQueryChange={vi.fn()} total={0} />);

    expect(screen.getByLabelText("Search users")).toHaveAttribute(
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

    expect(screen.getByLabelText("Search users")).toHaveAttribute(
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

    await user.type(screen.getByLabelText("Search users"), "ab");

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

  it("passes a custom className to the directory section", () => {
    const { container } = render(
      <UsersSearchCard
        query=""
        onQueryChange={vi.fn()}
        total={0}
        className="card-extra"
      />
    );

    expect(container.firstElementChild).toHaveClass(
      "card-extra"
    );
  });
});
