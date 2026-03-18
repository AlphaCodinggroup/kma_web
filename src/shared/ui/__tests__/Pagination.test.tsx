import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import Pagination from "../Pagination";

const defaultProps = {
  currentPage: 2,
  totalPages: 5,
  pageSize: 10,
  totalItems: 50,
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
};

describe("Pagination", () => {
  it("renders current page and total pages", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders item range text", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText("11")).toBeInTheDocument(); // startItem
    expect(screen.getByText("20")).toBeInTheDocument(); // endItem
    // totalItems "50" also matches the page-size option, so check via the
    // containing "Showing ... results" text block instead.
    expect(screen.getByText(/results/)).toHaveTextContent("Showing 11 to 20 of 50 results");
  });

  it("returns null when totalItems is 0", () => {
    const { container } = render(
      <Pagination {...defaultProps} totalItems={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls onPageChange with previous page when Previous is clicked", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />);

    await user.click(screen.getByRole("button", { name: /previous page/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("calls onPageChange with next page when Next is clicked", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />);

    await user.click(screen.getByRole("button", { name: /next page/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("disables the Previous button on the first page", () => {
    render(<Pagination {...defaultProps} currentPage={1} />);
    expect(screen.getByRole("button", { name: /previous page/i })).toBeDisabled();
  });

  it("disables the Next button on the last page", () => {
    render(<Pagination {...defaultProps} currentPage={5} />);
    expect(screen.getByRole("button", { name: /next page/i })).toBeDisabled();
  });

  it("calls onPageSizeChange when page size is changed", async () => {
    const onPageSizeChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination {...defaultProps} onPageSizeChange={onPageSizeChange} />);

    await user.selectOptions(screen.getByLabelText(/items per page/i), "25");
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });
});
