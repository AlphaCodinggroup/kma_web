import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "../theme-toggle";

const state = vi.hoisted(() => ({ theme: "system", setTheme: vi.fn() }));
vi.mock("next-themes", () => ({ useTheme: () => state }));

describe("ThemeToggle", () => {
  beforeEach(() => { state.theme = "system"; state.setTheme.mockClear(); });
  it.each(["light", "dark", "system"])("selects %s appearance", async (theme) => {
    render(<ThemeToggle />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Appearance" }), theme);
    expect(state.setTheme).toHaveBeenCalledWith(theme);
  });
  it("reflects the saved appearance", () => {
    state.theme = "dark";
    render(<ThemeToggle />);
    expect(screen.getByRole("combobox", { name: "Appearance" })).toHaveValue("dark");
  });
});
