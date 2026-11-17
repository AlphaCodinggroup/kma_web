import { webcrypto } from "node:crypto";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import CatalogManager from "../CatalogManager";

const repo = vi.hoisted(() => ({
  status: vi.fn(), versions: vi.fn(), operations: vi.fn(), items: vi.fn(),
  mutate: vi.fn(), operation: vi.fn(),
}));
vi.mock("../../api/catalog.repo.impl", () => ({ catalogRepo: repo }));
vi.mock("@shared/config/env", () => ({ PublicEnv: { locale: "en-US" } }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("crypto", webcrypto);
  sessionStorage.clear();
  window.history.replaceState(null, "", "/catalog");
  repo.status.mockResolvedValue({ enabled: true, active_version: "v1", revision: "r1", active: null });
  repo.versions.mockResolvedValue({ items: [] });
  repo.operations.mockResolvedValue({ items: [] });
  repo.items.mockResolvedValue({ version: "v1", items: [{ flow_id: "FLOW", catalog_item_id: "B1#01", question_code: "Q1" }] });
});
afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); });

function renderManager() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><CatalogManager /></QueryClientProvider>);
}

it("lets an uncertain deletion close and retry the same operation without enabling another write", async () => {
  repo.mutate.mockRejectedValueOnce({ code: "NETWORK_ERROR", message: "Disconnected" });
  repo.operation.mockRejectedValue({ code: "NOT_FOUND", message: "No saved operation" });
  renderManager();
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Delete Q1" }));
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete mitigation" }));
  const original = repo.mutate.mock.calls[0][0];
  expect(await within(screen.getByRole("dialog")).findByText(/Disconnected.*outcome is unknown/)).toBeVisible();
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add mitigation" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Check operation status" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Retry same operation" })).toBeEnabled());
  repo.mutate.mockImplementation(async input => ({ operation_id: input.operation_id, kind: "delete", status: "queued", message: "Queued" }));
  await user.click(screen.getByRole("button", { name: "Retry same operation" }));
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Retry same operation" }));
  await waitFor(() => expect(repo.mutate).toHaveBeenCalledTimes(2));
  expect(repo.mutate).toHaveBeenLastCalledWith(original);
});

it("allows Escape after enqueueing without cancelling or duplicating the pending operation", async () => {
  repo.mutate.mockImplementation(async input => ({ operation_id: input.operation_id, kind: "delete", status: "queued", message: "Queued" }));
  repo.operation.mockImplementation(() => new Promise(() => {}));
  renderManager();
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Delete Q1" }));
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete mitigation" }));
  await waitFor(() => expect(repo.mutate).toHaveBeenCalledTimes(1));
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add mitigation" })).toBeDisabled();
  expect(JSON.parse(sessionStorage.getItem("kma.catalog.pending-operation")!).id).toBe(repo.mutate.mock.calls[0][0].operation_id);
  expect(repo.mutate).toHaveBeenCalledTimes(1);
});
