import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ExportProgress } from "@entities/report/model/export-progress";
import ExportReportModal from "../ExportReportModal";

const base: ExportProgress = {
  phase: "generating",
  percent: 42,
  message: "Rendering the PDF…",
  bytes: null,
  error: null,
};

const props = {
  open: true,
  filename: "Project.pdf",
  onStop: vi.fn(),
  onRetry: vi.fn(),
  onClose: vi.fn(),
};

describe("ExportReportModal", () => {
  it("announces progress separately and stops waiting", async () => {
    const onStop = vi.fn();
    render(
      <ExportReportModal {...props} progress={base} onStop={onStop} />
    );

    expect(
      screen.getByRole("progressbar", { name: "Report export progress" })
    ).toHaveAttribute("aria-valuenow", "42");
    expect(screen.getByRole("status")).toHaveTextContent("Rendering the PDF…");

    await userEvent.click(screen.getByRole("button", { name: "Stop waiting" }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("shows the downloaded filename, size and completion action", async () => {
    const onClose = vi.fn();
    render(
      <ExportReportModal
        {...props}
        onClose={onClose}
        progress={{
          ...base,
          phase: "done",
          percent: 100,
          message: "Report downloaded.",
          bytes: 1_572_864,
        }}
      />
    );

    expect(screen.getByRole("heading", { name: "Report ready" })).toBeInTheDocument();
    expect(screen.getByText("Project.pdf")).toBeInTheDocument();
    expect(screen.getByText("1.5 MB")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("offers Retry for an error", async () => {
    const onRetry = vi.fn();
    render(
      <ExportReportModal
        {...props}
        onRetry={onRetry}
        progress={{
          ...base,
          phase: "error",
          percent: null,
          message: "The report could not be downloaded.",
          error: new Error("network"),
        }}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["timeout" as const, "Still working"],
    ["canceled" as const, "Waiting stopped"],
    ["queueing" as const, "Exporting report"],
    ["downloading" as const, "Exporting report"],
  ])("renders the %s state", (phase, heading) => {
    render(
      <ExportReportModal
        {...props}
        progress={{ ...base, phase, percent: null }}
      />
    );
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
  });

  it("allows passive states to close through the modal callback", async () => {
    const onClose = vi.fn();
    render(
      <ExportReportModal
        {...props}
        onClose={onClose}
        progress={{ ...base, phase: "canceled" }}
      />
    );

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
