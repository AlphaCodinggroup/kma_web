import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CatalogBrowser from "../CatalogBrowser";
const items = vi.hoisted(() => vi.fn());
vi.mock("../../api/catalog.repo.impl", () => ({ catalogRepo: { items } }));
const row = { catalog_item_id: "item-51", flow_id: "access", barrier_id: "B1", question_code: "Q51", question: "Is entry safe?", mitigation_id: "M1", barrier_statement: "Steps", proposed_mitigation: "Add ramp", adas_reference: "ADA 1", cost: 0, unit: "each" };
const renderBrowser = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><CatalogBrowser versions={[]} activeVersion="v1" /></QueryClientProvider>);
beforeEach(() => { vi.clearAllMocks(); window.history.replaceState(null, "", "/catalog"); items.mockResolvedValue({ items: [row], version: "v1", next_cursor: null }); });
describe("Catalog browsing", () => {
  it("shows all fields including zero costs and pins the returned version in the URL", async () => {
    renderBrowser();
    expect(await screen.findByText("Is entry safe?")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Details Q51" }));
    expect(screen.getByText("Add ramp")).toBeVisible();
    expect(screen.getByText("ADA 1")).toBeVisible();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    await waitFor(() => expect(new URLSearchParams(location.search).get("version")).toBe("v1"));
  });
  it("continues empty result pages when the server has a cursor", async () => {
    items.mockResolvedValueOnce({ items: [], version: "v1", next_cursor: "page2" });
    renderBrowser();
    await waitFor(() => expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(await screen.findByText("Is entry safe?")).toBeVisible();
    expect(items).toHaveBeenLastCalledWith(expect.objectContaining({ version: "v1", cursor: "page2" }), expect.any(AbortSignal));
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
