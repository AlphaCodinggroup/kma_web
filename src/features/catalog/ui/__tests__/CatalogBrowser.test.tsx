import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CatalogBrowser from "../CatalogBrowser";
const { items, exportVersion, download } = vi.hoisted(() => ({ items: vi.fn(), exportVersion: vi.fn(), download: vi.fn() }));
vi.mock("@shared/lib/download", () => ({ triggerAnchorDownload: download }));
vi.mock("../../api/catalog.repo.impl", () => ({ catalogRepo: { items, export: exportVersion } }));
const row = { catalog_item_id: "item-51", flow_id: "access", barrier_id: "B1", question_code: "Q51", question: "Is entry safe?", mitigation_id: "M1", barrier_statement: "Steps", proposed_mitigation: "Add ramp", adas_reference: "ADA 1", cost: 0, unit: "each" };
const renderBrowser = (props: Partial<React.ComponentProps<typeof CatalogBrowser>> = {}) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><CatalogBrowser versions={[]} activeVersion="v1" {...props} /></QueryClientProvider>);
beforeEach(() => { vi.clearAllMocks(); window.history.replaceState(null, "", "/catalog"); items.mockResolvedValue({ items: [row], version: "v1", next_cursor: null }); });
describe("Catalog browsing", () => {
  it("shows all fields including zero costs without pinning the active version in the URL", async () => {
    renderBrowser();
    expect(await screen.findByText("Is entry safe?")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Details Q51" }));
    expect(screen.getByText("Add ramp")).toBeVisible();
    expect(screen.getByText("ADA 1")).toBeVisible();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    expect(new URLSearchParams(location.search).has("version")).toBe(false);
    expect(screen.getByLabelText("Catalog version")).toHaveValue("active");
  });
  it("continues empty result pages when the server has a cursor", async () => {
    items.mockResolvedValueOnce({ items: [], version: "v1", next_cursor: "page2" });
    renderBrowser();
    await waitFor(() => expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(await screen.findByText("Is entry safe?")).toBeVisible();
    expect(items).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: "page2" }), expect.any(AbortSignal));
  });
  it("restores filters from the URL and clears the cursor on a new search", async () => {
    window.history.replaceState(null, "", "/catalog?version=old&q=ramp&flow_id=entry&barrier_id=B1&cursor=second");
    renderBrowser();
    expect(await screen.findByLabelText("Search catalog")).toHaveValue("ramp");
    await userEvent.clear(screen.getByLabelText("Search catalog"));
    await userEvent.type(screen.getByLabelText("Search catalog"), "door");
    await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() => expect(items).toHaveBeenLastCalledWith(expect.objectContaining({ q: "door", version: "old", flow_id: "entry", barrier_id: "B1" }), expect.any(AbortSignal)));
    expect(location.search).not.toContain("cursor=");
  });
});

it("aborts stale searches and never displays their late response", async () => {
  let finish: ((value: unknown) => void) | undefined;
  items.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  renderBrowser();
  await waitFor(() => expect(items).toHaveBeenCalledTimes(1));
  const signal = items.mock.calls[0][1] as AbortSignal;
  await userEvent.type(screen.getByLabelText("Search catalog"), "door");
  await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
  expect(await screen.findByText("Is entry safe?")).toBeVisible();
  expect(signal.aborted).toBe(true);
  finish?.({ items: [{ ...row, question: "Obsolete response" }], version: "v-old", next_cursor: null });
  expect(screen.queryByText("Obsolete response")).not.toBeInTheDocument();
});
it("provides an error recovery action", async () => {
  items.mockRejectedValueOnce(new Error("Catalog unavailable"));
  renderBrowser();
  expect(await screen.findByRole("alert")).toHaveTextContent("Catalog unavailable");
  await userEvent.click(screen.getByRole("button", { name: "Retry catalog records" }));
  expect(await screen.findByText("Is entry safe?")).toBeVisible();
});

it("disables CRUD for historical snapshots while exporting that whole version", async () => {
  window.history.replaceState(null, "", "/catalog?version=old&q=ramp&flow_id=entry&cursor=page2");
  items.mockResolvedValue({ items: [row], version: "old", next_cursor: null });
  exportVersion.mockResolvedValue(new Blob(["xlsx"]));
  const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:export-test");
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  renderBrowser({ revision: "r1", canChange: true, onSave: vi.fn() });
  await screen.findByText("Is entry safe?");
  expect(screen.getByRole("button", { name: "Add mitigation" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Edit Q51" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Delete Q51" })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Export Excel" }));
  expect(exportVersion).toHaveBeenCalledWith("old");
  expect(download).toHaveBeenCalledWith("blob:export-test", "catalog.xlsx");
  create.mockRestore(); revoke.mockRestore();
});
it("enables CRUD only for a loaded active snapshot and preserves export failures", async () => {
  renderBrowser({ revision: "r1", canChange: true, onSave: vi.fn() });
  await screen.findByText("Is entry safe?");
  expect(screen.getByRole("button", { name: "Add mitigation" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Edit Q51" })).toBeEnabled();
  await userEvent.click(screen.getByRole("button", { name: "Edit Q51" }));
  expect(screen.getByRole("dialog", { name: "Edit mitigation" })).toBeVisible();
  expect(screen.getByLabelText("Mitigation")).toHaveValue("Add ramp");
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  exportVersion.mockRejectedValueOnce({ code: "CONFLICT", message: "Version unavailable" });
  await userEvent.click(screen.getByRole("button", { name: "Export Excel" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Version unavailable");
});
it("navigates to a completed operation version and removes the old cursor", async () => {
  window.history.replaceState(null, "", "/catalog?version=v1&q=ramp&cursor=page2");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const props = { versions: [], activeVersion: "v1", revision: "r1", canChange: true, onSave: vi.fn() };
  const { rerender } = render(<QueryClientProvider client={client}><CatalogBrowser {...props} /></QueryClientProvider>);
  await screen.findByText("Is entry safe?");
  items.mockResolvedValue({ items: [row], version: "v2", next_cursor: null });
  rerender(<QueryClientProvider client={client}><CatalogBrowser {...props} activeVersion="v2" revision="r2" result={{ operation_id: "op1", kind: "update", status: "completed", message: "Saved", version: "v2" }} /></QueryClientProvider>);
  await waitFor(() => expect(new URLSearchParams(location.search).has("version")).toBe(false));
  expect(location.search).not.toContain("cursor=");
  expect(location.search).toContain("q=ramp");
  await waitFor(() => expect(items).toHaveBeenLastCalledWith(expect.objectContaining({ q: "ramp" }), expect.any(AbortSignal)));
});

it("keeps active browsing selected across pagination and new searches", async () => {
  items.mockResolvedValueOnce({ items: [row], version: "legacy", next_cursor: "page2" });
  renderBrowser({ activeVersion: "legacy" });
  await screen.findByText("Is entry safe?");
  expect(screen.getByLabelText("Catalog version")).toHaveValue("active");
  expect(location.search).not.toContain("version=");
  await userEvent.click(screen.getByRole("button", { name: "Next page" }));
  await waitFor(() => expect(items).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: "page2" }), expect.any(AbortSignal)));
  expect(items.mock.calls.at(-1)?.[0].version).toBeUndefined();
  expect(location.search).not.toContain("version=");
  await userEvent.type(screen.getByLabelText("Search catalog"), "ramp");
  await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
  await waitFor(() => expect(items).toHaveBeenLastCalledWith(expect.objectContaining({ q: "ramp" }), expect.any(AbortSignal)));
  expect(items.mock.calls.at(-1)?.[0]).not.toHaveProperty("cursor");
  expect(items.mock.calls.at(-1)?.[0].version).toBeUndefined();
});
it("reloads active records when the active catalog changes without selecting history", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { rerender } = render(<QueryClientProvider client={client}><CatalogBrowser versions={[]} activeVersion="v1" revision="r1" /></QueryClientProvider>);
  await screen.findByText("Is entry safe?");
  items.mockResolvedValue({ items: [{ ...row, question: "New active catalog" }], version: "v2", next_cursor: null });
  rerender(<QueryClientProvider client={client}><CatalogBrowser versions={[]} activeVersion="v2" revision="r2" /></QueryClientProvider>);
  expect(await screen.findByText("New active catalog")).toBeVisible();
  expect(location.search).not.toContain("version=");
  expect(screen.getByLabelText("Catalog version")).toHaveValue("active");
});
it("allows consulting the original catalog and returning to the active one", async () => {
  renderBrowser({ versions: [{ version: "legacy", file_name: "Legacy catalog", active: false, status: "ready", item_count: 1, flow_count: 1, uploaded_at: null, uploaded_by: null, sha256: "" }] });
  await screen.findByText("Is entry safe?");
  await userEvent.selectOptions(screen.getByLabelText("Catalog version"), "legacy");
  await waitFor(() => expect(items).toHaveBeenLastCalledWith(expect.objectContaining({ version: "legacy" }), expect.any(AbortSignal)));
  expect(location.search).toContain("version=legacy");
  await userEvent.selectOptions(screen.getByLabelText("Catalog version"), "active");
  await waitFor(() => expect(new URLSearchParams(location.search).has("version")).toBe(false));
  expect(screen.getByLabelText("Catalog version")).toHaveValue("active");
});
