import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import FinalReportHeader from "../FinalReportHeader";

describe("report state controls", () => {
  it("enables export only when findings exist and no export is running", () => {
    const onExport = vi.fn();
    const { rerender } = render(
      <FinalReportHeader disabled={true} onExport={onExport} />
    );
    expect(screen.getByRole("button", { name: "Export to PDF" })).toBeDisabled();

    rerender(
      <FinalReportHeader
        disabled={false}
        exporting={false}
        onExport={onExport}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Export to PDF" }));
    expect(onExport).toHaveBeenCalledTimes(1);

    rerender(
      <FinalReportHeader
        disabled={false}
        exporting={true}
        onExport={onExport}
      />
    );
    const runningButton = screen.getByRole("button", { name: "Export to PDF" });
    expect(runningButton).toBeDisabled();
    fireEvent.click(runningButton);
    expect(onExport).toHaveBeenCalledTimes(1);
  });
});
