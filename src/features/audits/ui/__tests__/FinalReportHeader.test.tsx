import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import FinalReportHeader from "../FinalReportHeader";

describe("FinalReportHeader", () => {
  it("keeps the accessible name and invokes export", async () => {
    const onExport = vi.fn();
    render(<FinalReportHeader disabled={false} onExport={onExport} />);

    await userEvent.click(screen.getByLabelText("Export to PDF"));
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it("shows the configured phase while loading", () => {
    render(
      <FinalReportHeader
        disabled={false}
        onExport={vi.fn()}
        exporting
        loadingLabel="Rendering the PDF… 42%"
      />
    );

    const button = screen.getByLabelText("Export to PDF");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Rendering the PDF… 42%");
  });

  it("disables export without findings or a callback and renders the addon", () => {
    const { rerender } = render(
      <FinalReportHeader disabled rightAddon={<span>Status</span>} />
    );
    expect(screen.getByLabelText("Export to PDF")).toBeDisabled();
    expect(screen.getByText("Status")).toBeInTheDocument();

    rerender(
      <FinalReportHeader disabled onExport={vi.fn()} exporting={false} />
    );
    expect(screen.getByLabelText("Export to PDF")).toBeDisabled();
  });
});
