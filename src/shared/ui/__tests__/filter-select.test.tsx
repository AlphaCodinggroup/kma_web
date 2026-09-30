/**
 * Desplegable de filtro y botón de limpiar compartidos por las barras de búsqueda.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ClearFiltersButton, FilterSelect } from "../filter-select";

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
];

describe("FilterSelect", () => {
  it("puts the empty option first when it has an all label", () => {
    render(
      <FilterSelect value="" onChange={vi.fn()} options={options} allLabel="All" ariaLabel="Letter" />
    );

    const select = screen.getByRole("combobox", { name: "Letter" });
    expect(Array.from(select.querySelectorAll("option")).map((o) => [o.value, o.textContent])).toEqual([
      ["", "All"],
      ["a", "Alpha"],
      ["b", "Beta"],
    ]);
  });

  it("lists only the options without an all label", () => {
    render(<FilterSelect value="a" onChange={vi.fn()} options={options} ariaLabel="Letter" />);

    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.getByRole("combobox", { name: "Letter" })).toHaveValue("a");
  });

  it("reports the chosen value", async () => {
    const onChange = vi.fn();
    render(<FilterSelect value="" onChange={onChange} options={options} allLabel="All" ariaLabel="Letter" />);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Letter" }), "b");

    expect(onChange).toHaveBeenCalledWith("b");
  });
});

describe("ClearFiltersButton", () => {
  it("clears on click", async () => {
    const onClick = vi.fn();
    render(<ClearFiltersButton onClick={onClick} />);

    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
