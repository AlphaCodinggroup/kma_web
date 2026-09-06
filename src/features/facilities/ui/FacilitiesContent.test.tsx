import React from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: {} as any,
  filters: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  archive: vi.fn(),
  restore: vi.fn(),
  createError: null as Error | null,
  updateError: null as Error | null,
  pending: false,
}));
vi.mock("@features/facilities/ui/hooks/useFacilitiesQuery", () => ({
  useFacilitiesQuery: (filters: unknown) => {
    mocks.filters(filters);
    return mocks.query;
  },
}));
vi.mock("@features/facilities/ui/hooks/useCreateFacilityMutation", () => ({ useCreateFacilityMutation: () => ({ mutateAsync: mocks.create, isPending: mocks.pending, error: mocks.createError }) }));
vi.mock("@features/facilities/ui/hooks/useUpdateFacilityMutation", () => ({ useUpdateFacilityMutation: () => ({ mutateAsync: mocks.update, isPending: mocks.pending, error: mocks.updateError }) }));
vi.mock("@features/facilities/ui/hooks/useDeleteFacilityMutation", () => ({ useDeleteFacilityMutation: () => ({ mutateAsync: mocks.remove, isPending: mocks.pending }) }));
vi.mock("@features/facilities/ui/hooks/useArchiveFacilityMutation", () => ({ useArchiveFacilityMutation: () => ({ mutateAsync: mocks.archive, isPending: mocks.pending }) }));
vi.mock("@features/facilities/ui/hooks/useRestoreFacilityMutation", () => ({ useRestoreFacilityMutation: () => ({ mutateAsync: mocks.restore, isPending: mocks.pending }) }));
vi.mock("@shared/lib/useDebouncedSearch", () => ({ useDebouncedSearch: (value: string) => value }));
vi.mock("@features/facilities/ui/FacilitySearchCard", () => ({
  default: ({ total, query, onQueryChange, showArchived, onToggleArchived, children }: any) => (
    <section data-testid="facility-search" data-total={total} data-archived={showArchived}>
      <input aria-label="Facility search" value={query} onChange={(event) => onQueryChange(event.target.value)} />
      <button onClick={onToggleArchived}>Toggle archived</button>
      {children}
    </section>
  ),
}));
vi.mock("@features/facilities/ui/FacilityTable", () => ({
  default: (props: any) => (
    <div data-testid="facility-table" data-items={props.items.map((item: any) => item.id).join(",")} data-archived={props.showArchived} data-loading={props.isLoading} data-error={props.isError}>
      <button onClick={props.onError}>Reload facilities</button>
      <button onClick={() => props.onEdit("f1")}>Edit facility</button>
      <button onClick={() => props.onEdit("missing")}>Edit missing</button>
      <button onClick={() => props.onDelete("f1")}>Delete facility</button>
      <button onClick={() => props.onArchive("f1")}>Archive facility</button>
      <button onClick={() => props.onRestore("f1")}>Restore facility</button>
    </div>
  ),
}));
vi.mock("@features/facilities/ui/CreateFacilityDialog", () => ({
  default: ({ open, onOpenChange, onSubmit, loading, error }: any) => open ? (
    <div data-testid="create-facility" data-loading={loading} data-error={error ?? ""}><button onClick={() => onSubmit({ name: "New facility", address: "  Main St ", city: " Boston ", description: "  Site ", photoUrl: " https://image " })}>Submit facility</button><button onClick={() => onOpenChange(false)}>Cancel create</button></div>
  ) : null,
}));
vi.mock("@features/facilities/ui/EditFacilityDialog", () => ({
  default: ({ open, onOpenChange, onSubmit, defaultValues, loading, error }: any) => open ? (
    <div data-testid="edit-facility" data-defaults={JSON.stringify(defaultValues)} data-loading={loading} data-error={error ?? ""}><button onClick={() => onSubmit({ name: "Updated", address: "", city: "", description: "", photoUrl: "" })}>Submit edit</button><button onClick={() => onOpenChange(false)}>Cancel edit</button></div>
  ) : null,
}));
vi.mock("@shared/ui/confirm-dialog", () => ({
  default: ({ open, onOpenChange, onConfirm, confirmLabel, loading }: any) => open ? <div data-testid={`confirm-${String(confirmLabel).toLowerCase()}`} data-loading={loading}><button onClick={onConfirm}>{confirmLabel}</button><button onClick={() => onOpenChange(false)}>Cancel {confirmLabel}</button></div> : null,
}));

import { FacilitiesContent } from "./FacilitiesContent";

const facilities = [
  { id: "f1", name: "Main Office", address: "One Street", city: "Boston", description: "HQ", notes: null, photoUrl: "https://image/1", status: "ACTIVE" },
  { id: "f2", name: "Warehouse", address: "Two Street", city: "Chicago", description: null, notes: "Storage", photoUrl: null, status: "ACTIVE" },
];

describe("FacilitiesContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query = { data: { items: facilities }, isLoading: false, isError: false, refetch: vi.fn() };
    mocks.create.mockResolvedValue({});
    mocks.update.mockResolvedValue({});
    mocks.remove.mockResolvedValue({});
    mocks.archive.mockResolvedValue({});
    mocks.restore.mockResolvedValue({});
    mocks.pending = false;
    mocks.createError = null;
    mocks.updateError = null;
  });
  afterEach(() => cleanup());

  it("filters by name, address and city and toggles archived data", async () => {
    const user = userEvent.setup();
    render(<FacilitiesContent />);
    expect(mocks.filters).toHaveBeenLastCalledWith({ status: "ACTIVE" });
    await user.type(screen.getByRole("textbox", { name: "Facility search" }), "chicago");
    expect(screen.getByTestId("facility-table")).toHaveAttribute("data-items", "f2");
    await user.click(screen.getByRole("button", { name: "Toggle archived" }));
    expect(mocks.filters).toHaveBeenLastCalledWith({ status: "ARCHIVED" });
    expect(screen.getByTestId("facility-table")).toHaveAttribute("data-archived", "true");
  });

  it("creates through child and imperative triggers and keeps failures open", async () => {
    const user = userEvent.setup();
    const createTriggerRef = React.createRef<(() => void) | undefined>() as React.MutableRefObject<(() => void) | undefined>;
    render(<FacilitiesContent createTriggerRef={createTriggerRef} />);
    act(() => createTriggerRef.current?.());
    await screen.findByTestId("create-facility");
    await user.click(screen.getByRole("button", { name: "Submit facility" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({ name: "New facility", address: "  Main St ", city: " Boston ", description: "  Site ", photoUrl: "https://image" }));
    expect(screen.queryByTestId("create-facility")).not.toBeInTheDocument();
  });

  it("edits a facility with mapped defaults and clears optional values", async () => {
    const user = userEvent.setup();
    render(<FacilitiesContent />);
    await user.click(screen.getByRole("button", { name: "Edit facility" }));
    expect(screen.getByTestId("edit-facility")).toHaveAttribute("data-defaults", expect.stringContaining("Main Office"));
    await user.click(screen.getByRole("button", { name: "Submit edit" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ id: "f1", name: "Updated" }));
    expect(screen.queryByTestId("edit-facility")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit missing" }));
    expect(screen.queryByTestId("edit-facility")).not.toBeInTheDocument();
  });

  it.each([
    ["Delete facility", "Delete", "remove"],
    ["Archive facility", "Archive", "archive"],
    ["Restore facility", "Restore", "restore"],
  ] as const)("completes %s", async (openLabel, confirmLabel, mutation) => {
    const user = userEvent.setup();
    render(<FacilitiesContent />);
    await user.click(screen.getByRole("button", { name: openLabel }));
    await user.click(screen.getByRole("button", { name: confirmLabel }));
    await waitFor(() => expect(mocks[mutation]).toHaveBeenCalledWith("f1"));
    expect(screen.queryByTestId(`confirm-${confirmLabel.toLowerCase()}`)).not.toBeInTheDocument();
  });

  it.each([
    ["Delete facility", "Delete", "remove", "Delete failed"],
    ["Archive facility", "Archive", "archive", "Archive failed"],
    ["Restore facility", "Restore", "restore", "Restore failed"],
  ] as const)("shows %s errors", async (openLabel, confirmLabel, mutation, message) => {
    const user = userEvent.setup();
    mocks[mutation].mockRejectedValueOnce(new Error(message));
    render(<FacilitiesContent />);
    await user.click(screen.getByRole("button", { name: openLabel }));
    await user.click(screen.getByRole("button", { name: confirmLabel }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByTestId(`confirm-${confirmLabel.toLowerCase()}`)).toBeInTheDocument();
  });

  it("forwards query and mutation states", async () => {
    const user = userEvent.setup();
    mocks.query = { data: undefined, isLoading: true, isError: true, refetch: vi.fn() };
    mocks.pending = true;
    mocks.createError = new Error("Create error");
    render(<FacilitiesContent />);
    expect(screen.getByTestId("facility-table")).toHaveAttribute("data-loading", "true");
    await user.click(screen.getByRole("button", { name: "Reload facilities" }));
    expect(mocks.query.refetch).toHaveBeenCalled();
  });

  it("filters a facility that carries neither address nor city", async () => {
    const user = userEvent.setup();
    mocks.query = {
      data: { items: [{ id: "f3", name: "Bare site" }] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };

    render(<FacilitiesContent />);
    await user.type(screen.getByRole("textbox", { name: "Facility search" }), "bare");
    expect(screen.getByTestId("facility-table")).toHaveAttribute("data-items", "f3");

    await user.clear(screen.getByRole("textbox", { name: "Facility search" }));
    await user.type(screen.getByRole("textbox", { name: "Facility search" }), "boston");
    expect(screen.getByTestId("facility-table")).toHaveAttribute("data-items", "");
  });

  it.each([
    ["Delete facility", "Delete", "remove", "Failed to delete facility."],
    ["Archive facility", "Archive", "archive", "Failed to archive facility."],
    ["Restore facility", "Restore", "restore", "Failed to restore facility."],
  ] as const)("falls back to a default message when %s rejects plainly", async (openLabel, confirmLabel, mutation, message) => {
    const user = userEvent.setup();
    mocks[mutation].mockRejectedValueOnce("plain rejection");
    render(<FacilitiesContent />);

    await user.click(screen.getByRole("button", { name: openLabel }));
    await user.click(screen.getByRole("button", { name: confirmLabel }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });

  it("ignores the rows that are no longer listed", async () => {
    const user = userEvent.setup();
    mocks.query = { data: { items: [] }, isLoading: false, isError: false, refetch: vi.fn() };
    render(<FacilitiesContent />);

    await user.click(screen.getByRole("button", { name: "Delete facility" }));
    await user.click(screen.getByRole("button", { name: "Archive facility" }));
    await user.click(screen.getByRole("button", { name: "Restore facility" }));

    expect(screen.queryByTestId("confirm-delete")).not.toBeInTheDocument();
    expect(screen.queryByTestId("confirm-archive")).not.toBeInTheDocument();
    expect(screen.queryByTestId("confirm-restore")).not.toBeInTheDocument();
  });

  it("keeps the dialogs open when the creation or the update fails", async () => {
    const user = userEvent.setup();
    const createTriggerRef = React.createRef<(() => void) | undefined>() as React.MutableRefObject<(() => void) | undefined>;
    mocks.create.mockRejectedValueOnce(new Error("Create failed"));
    mocks.update.mockRejectedValueOnce(new Error("Update failed"));
    render(<FacilitiesContent createTriggerRef={createTriggerRef} />);

    act(() => createTriggerRef.current?.());
    await screen.findByTestId("create-facility");
    await user.click(screen.getByRole("button", { name: "Submit facility" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalled());
    expect(screen.getByTestId("create-facility")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel create" }));

    await user.click(screen.getByRole("button", { name: "Edit facility" }));
    await user.click(screen.getByRole("button", { name: "Submit edit" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    expect(screen.getByTestId("edit-facility")).toBeInTheDocument();
  });
});
