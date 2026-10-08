/**
 * Barra de acciones del reporte: aviso de cambios sin guardar, y Approve,
 * Return (a la espera del backend) y Download.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ReportActionBar, { type ReportActionBarProps } from "../ReportActionBar";

function renderBar(overrides: Partial<ReportActionBarProps> = {}) {
  const props: ReportActionBarProps = {
    isDirty: false,
    hasErrors: false,
    isSaving: false,
    saveError: null,
    onSave: vi.fn(),
    onDiscard: vi.fn(),
    canApprove: true,
    approving: false,
    onApprove: vi.fn(),
    canDownload: true,
    downloading: false,
    onDownload: vi.fn(),
    ...overrides,
  };
  render(<ReportActionBar {...props} />);
  return props;
}

describe("ReportActionBar", () => {
  it("approves and downloads without pending changes", async () => {
    const props = renderBar();

    expect(screen.queryByRole("status")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    await userEvent.click(screen.getByRole("button", { name: "Download" }));

    expect(props.onApprove).toHaveBeenCalledTimes(1);
    expect(props.onDownload).toHaveBeenCalledTimes(1);
  });

  it("asks to save before approving or downloading", async () => {
    const props = renderBar({ isDirty: true });

    expect(screen.getByRole("status")).toHaveTextContent("Changes detected — save to continue");
    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Download" })).toHaveAttribute(
      "title",
      "Save your changes first"
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(props.onSave).toHaveBeenCalledTimes(1);
    expect(props.onDiscard).toHaveBeenCalledTimes(1);
  });

  it("does not save while a field is invalid", () => {
    renderBar({ isDirty: true, hasErrors: true });

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("shows the save in progress", () => {
    renderBar({ isDirty: true, isSaving: true });

    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Discard" })).toBeDisabled();
  });

  it("shows the save error", () => {
    renderBar({ saveError: "1 change could not be saved." });

    expect(screen.getByRole("status")).toHaveTextContent("1 change could not be saved.");
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  });

  it("keeps Return disabled until the backend supports it", () => {
    renderBar();

    expect(screen.getByRole("button", { name: "Return" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Return" })).toHaveAttribute(
      "title",
      "Returning an audit is currently unavailable"
    );
  });

  it("explains why approving or downloading is not possible yet", () => {
    renderBar({ canApprove: false, canDownload: false });

    expect(screen.getByRole("button", { name: "Approve" })).toHaveAttribute(
      "title",
      "Only an audit in review can be approved"
    );
    expect(screen.getByRole("button", { name: "Download" })).toHaveAttribute(
      "title",
      "Available once the report is approved"
    );
  });

  it("disables the actions while they run", () => {
    renderBar({ approving: true, downloading: true });

    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Download" })).toBeDisabled();
  });
});
