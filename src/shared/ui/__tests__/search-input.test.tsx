import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import SearchInput from "../search-input";

describe("SearchInput", () => {
  it("renders a search typed input with the default placeholder", () => {
    render(<SearchInput aria-label="Search" />);

    const input = screen.getByLabelText("Search");
    expect(input).toHaveAttribute("type", "search");
    expect(input).toHaveAttribute("placeholder", "Search…");
  });

  it("honours a custom placeholder", () => {
    render(<SearchInput aria-label="Search" placeholder="Find a report" />);

    expect(screen.getByLabelText("Search")).toHaveAttribute(
      "placeholder",
      "Find a report"
    );
  });

  it("keeps room for the embedded icon through the pl-10 class", () => {
    render(<SearchInput aria-label="Search" />);

    expect(screen.getByLabelText("Search")).toHaveClass("pl-10", "w-full");
  });

  it("merges a custom className on the input", () => {
    render(<SearchInput aria-label="Search" className="input-extra" />);

    expect(screen.getByLabelText("Search")).toHaveClass("input-extra", "pl-10");
  });

  it("merges a custom containerClassName on the wrapper", () => {
    const { container } = render(
      <SearchInput aria-label="Search" containerClassName="wrapper-extra" />
    );

    expect(container.firstElementChild).toHaveClass("relative", "wrapper-extra");
  });

  it("renders the decorative icon as aria-hidden", () => {
    const { container } = render(<SearchInput aria-label="Search" />);

    const icon = container.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("calls onChange while typing and reflects the value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SearchInput aria-label="Search" onChange={onChange} />);

    await user.type(screen.getByLabelText("Search"), "kma");

    expect(onChange).toHaveBeenCalledTimes(3);
    expect(screen.getByLabelText("Search")).toHaveValue("kma");
  });

  it("renders in the disabled state", () => {
    render(<SearchInput aria-label="Search" disabled />);

    expect(screen.getByLabelText("Search")).toBeDisabled();
  });

  const errorCases: Array<{ error: boolean | undefined; shouldHave: boolean }> = [
    { error: true, shouldHave: true },
    { error: false, shouldHave: false },
    { error: undefined, shouldHave: false },
  ];

  it.each(errorCases)(
    "applies the error ring when error is $error",
    ({ error, shouldHave }) => {
      render(
        <SearchInput
          aria-label="Search"
          {...(error !== undefined ? { error } : {})}
        />
      );

      const input = screen.getByLabelText("Search");
      if (shouldHave) {
        expect(input).toHaveClass("ring-red-400");
      } else {
        expect(input).not.toHaveClass("ring-red-400");
      }
    }
  );

  it("forwards extra props such as name and value", () => {
    render(
      <SearchInput
        aria-label="Search"
        name="q"
        value="preset"
        onChange={() => undefined}
      />
    );

    const input = screen.getByLabelText("Search");
    expect(input).toHaveAttribute("name", "q");
    expect(input).toHaveValue("preset");
  });

  it("forwards its ref to the underlying input", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<SearchInput ref={ref} aria-label="Search" />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toHaveAttribute("type", "search");
  });

  it("exposes a displayName", () => {
    expect(SearchInput.displayName).toBe("SearchInput");
  });
});
