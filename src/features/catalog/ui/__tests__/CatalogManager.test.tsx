import { createHash, webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  render as rtlRender,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  CatalogPreview,
  CatalogVersion,
  CatalogOperation,
} from "@entities/catalog/model/catalog";
import CatalogManager from "../CatalogManager";
import { createApiErrorFromAxios } from "@shared/interceptors/error";
import type { AxiosError } from "axios";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
function render(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return rtlRender(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

vi.mock("../CatalogBrowser", () => ({ default: () => null }));
vi.mock("@shared/config/env", () => ({ PublicEnv: { locale: "en-US" } }));
const repo = vi.hoisted(() => ({
  status: vi.fn(),
  versions: vi.fn(),
  validate: vi.fn(),
  imports: vi.fn(),
  operations: vi.fn(),
  activate: vi.fn(),
  operation: vi.fn(),
}));
vi.mock("../../api/catalog.repo.impl", () => ({ catalogRepo: repo }));
const version: CatalogVersion = {
  version: "v-old",
  file_name: "old.xlsx",
  sha256: "old-sha",
  item_count: null,
  flow_count: null,
  uploaded_at: null,
  uploaded_by: null,
  status: "ready",
  active: false,
};
const initialStatus = {
  active_version: "legacy",
  revision: "legacy:0",
  active: null,
  enabled: true,
  limits: {
    max_file_size: 3145728,
    max_uncompressed_size: 33554432,
    max_items: 10000,
    preview_size: 20,
  },
};
const preview: CatalogPreview = {
  file_name: "catalog.xlsx",
  sha256: createHash("sha256").update("xlsx-content").digest("hex"),
  item_count: 1843,
  flow_count: 52,
  duplicate_count: 0,
  warnings: ["4 rows excluded from Pending variants", "8 items have zero cost"],
  sample: [
    {
      flow_code: "F1",
      barrier_id: "B1",
      question_code: "Q1",
      question: "Is it accessible?",
      cost: 0,
      unit: null,
    },
  ],
  expected_revision: "legacy:0",
};
const completed: CatalogOperation = {
  operation_id: "op",
  kind: "upload",
  status: "completed",
  message: "Catalog replaced successfully",
  version: "new-version",
  revision: "new-revision",
  item_count: 1843,
  flow_count: 52,
};
const workbook = () =>
  new File(["xlsx-content"], "catalog.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  vi.stubGlobal("crypto", webcrypto);
  repo.status.mockResolvedValue(initialStatus);
  repo.versions.mockResolvedValue({ items: [version], next_cursor: null });
  repo.validate.mockResolvedValue(preview);
  repo.imports.mockResolvedValue(completed);
  repo.operations.mockResolvedValue({ items: [], next_cursor: null });
  repo.activate.mockResolvedValue({ ...completed, kind: "activate" });
  repo.operation.mockResolvedValue(completed);
});
afterEach(() => vi.unstubAllGlobals());
async function selectAndValidate(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText("Original catalog");
  await user.upload(screen.getByLabelText("XLSX file"), workbook());
  await user.click(screen.getByRole("button", { name: "Validate file" }));
  await screen.findByRole("heading", { name: "Validation preview" });
}
async function confirmReplace(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Replace catalog" }));
  const dialog = screen.getByRole("dialog", { name: "Replace catalog?" });
  await user.click(
    within(dialog).getByRole("button", { name: "Replace catalog" }),
  );
}

describe("Catalog manager", () => {
  it("validates on request without writes and renders bounded preview, warnings and zero cost", async () => {
    const user = userEvent.setup();
    render(<CatalogManager />);
    await selectAndValidate(user);
    expect(repo.validate).toHaveBeenCalledWith({
      file_name: "catalog.xlsx",
      file_content: btoa("xlsx-content"),
    });
    expect(screen.getByText("1,843 items")).toBeInTheDocument();
    expect(screen.getByText("52 flows")).toBeInTheDocument();
    expect(
      screen.getByText("4 rows excluded from Pending variants"),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "0" })).toBeInTheDocument();
    expect(repo.imports).not.toHaveBeenCalled();
    expect(repo.activate).not.toHaveBeenCalled();
  });
  it("invalidates preview as soon as the selected file changes", async () => {
    const user = userEvent.setup();
    render(<CatalogManager />);
    await selectAndValidate(user);
    await user.upload(
      screen.getByLabelText("XLSX file"),
      new File(["second"], "second.xlsx"),
    );
    expect(
      screen.queryByRole("heading", { name: "Validation preview" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Replace catalog" }),
    ).not.toBeInTheDocument();
    expect(repo.imports).not.toHaveBeenCalled();
  });
  it("ignores a validation response for a file that changed during the request", async () => {
    let resolve!: (value: CatalogPreview) => void;
    repo.validate.mockReturnValueOnce(
      new Promise<CatalogPreview>((done) => {
        resolve = done;
      }),
    );
    const user = userEvent.setup();
    render(<CatalogManager />);
    await screen.findByText("Original catalog");
    await user.upload(screen.getByLabelText("XLSX file"), workbook());
    await user.click(screen.getByRole("button", { name: "Validate file" }));
    await waitFor(() => expect(repo.validate).toHaveBeenCalledTimes(1));
    await user.upload(
      screen.getByLabelText("XLSX file"),
      new File(["second"], "second.xlsx"),
    );
    resolve(preview);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Validate file" }),
      ).toBeEnabled(),
    );
    expect(
      screen.queryByRole("heading", { name: "Validation preview" }),
    ).not.toBeInTheDocument();
  });
  it("requires confirmation and sends the validated revision and a UUID exactly once", async () => {
    const user = userEvent.setup();
    render(<CatalogManager />);
    await selectAndValidate(user);
    await user.click(screen.getByRole("button", { name: "Replace catalog" }));
    expect(repo.imports).not.toHaveBeenCalled();
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Cancel",
      }),
    );
    expect(repo.imports).not.toHaveBeenCalled();
    await confirmReplace(user);
    expect(
      await screen.findByText("Catalog replaced successfully"),
    ).toBeInTheDocument();
    expect(repo.imports).toHaveBeenCalledTimes(1);
    expect(repo.imports).toHaveBeenCalledWith({
      file_name: "catalog.xlsx",
      file_content: btoa("xlsx-content"),
      expected_revision: "legacy:0",
      operation_id: expect.stringMatching(
        /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
      ),
    });
    await waitFor(() => expect(repo.status).toHaveBeenCalledTimes(2));
    expect(
      screen.queryByRole("heading", { name: "Validation preview" }),
    ).not.toBeInTheDocument();
  });
  it("shows row validation errors without making an upload available", async () => {
    repo.validate.mockRejectedValueOnce(
      createApiErrorFromAxios({
        isAxiosError: true,
        message: "Request failed with status code 400",
        response: {
          status: 400,
          data: {
            error: {
              code: "VALIDATION_ERROR",
              message: "Row 8: duplicate question code",
            },
          },
        },
      } as AxiosError),
    );
    const user = userEvent.setup();
    render(<CatalogManager />);
    await screen.findByText("Original catalog");
    await user.upload(screen.getByLabelText("XLSX file"), workbook());
    await user.click(screen.getByRole("button", { name: "Validate file" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Row 8: duplicate question code",
    );
    expect(
      screen.queryByRole("button", { name: "Replace catalog" }),
    ).not.toBeInTheDocument();
  });
  it("preserves an uncertain operation and reconciles with GET without retrying the upload", async () => {
    repo.imports.mockRejectedValueOnce({
      code: "NETWORK_ERROR",
      message: "Network disconnected",
    });
    const user = userEvent.setup();
    render(<CatalogManager />);
    await selectAndValidate(user);
    await confirmReplace(user);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /outcome is unknown/i,
    );
    expect(
      screen.queryByText("Catalog replaced successfully"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Validate file" }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Check operation status" }),
    );
    expect(
      await screen.findByText("Catalog replaced successfully"),
    ).toBeInTheDocument();
    expect(repo.operation).toHaveBeenCalledWith(
      repo.imports.mock.calls[0][0].operation_id,
    );
    expect(repo.imports).toHaveBeenCalledTimes(1);
  });
  it("keeps running operations unresolved until an explicit status query completes", async () => {
    repo.imports.mockResolvedValueOnce({
      ...completed,
      status: "running",
      message: "Still processing",
    });
    const user = userEvent.setup();
    render(<CatalogManager />);
    await selectAndValidate(user);
    await confirmReplace(user);
    expect(await screen.findByText("Still processing")).toBeInTheDocument();
    expect(repo.operation).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Check operation status" }),
    );
    expect(
      await screen.findByText("Catalog replaced successfully"),
    ).toBeInTheDocument();
  });
  it("invalidates preview and refreshes revision after a conflict without retry", async () => {
    repo.imports.mockRejectedValueOnce({
      code: "CONFLICT",
      message: "Catalog changed; validate again",
    });
    const user = userEvent.setup();
    render(<CatalogManager />);
    await selectAndValidate(user);
    await confirmReplace(user);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Catalog changed; validate again",
    );
    expect(
      screen.queryByRole("heading", { name: "Validation preview" }),
    ).not.toBeInTheDocument();
    expect(repo.imports).toHaveBeenCalledTimes(1);
    expect(repo.operation).not.toHaveBeenCalled();
    await waitFor(() => expect(repo.status).toHaveBeenCalledTimes(2));
  });
  it("restores history only after confirmation with the current revision", async () => {
    const user = userEvent.setup();
    render(<CatalogManager />);
    await user.click(
      await screen.findByRole("button", { name: "Restore old.xlsx" }),
    );
    expect(repo.activate).not.toHaveBeenCalled();
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Restore catalog version?" }),
      ).getByRole("button", { name: "Restore version" }),
    );
    await screen.findByText("Catalog replaced successfully");
    expect(repo.activate).toHaveBeenCalledWith({
      version: "v-old",
      expected_revision: "legacy:0",
      operation_id: expect.any(String),
    });
  });
  it("disables mutation when management is not enabled", async () => {
    repo.status.mockResolvedValueOnce({ ...initialStatus, enabled: false });
    render(<CatalogManager />);
    await screen.findByText("Original catalog");
    expect(
      screen.getByText(/Catalog changes are currently disabled/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("XLSX file")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Restore old.xlsx" }),
    ).toBeDisabled();
  });
  it("loads history pages without losing earlier entries or inventing missing counts", async () => {
    repo.versions
      .mockResolvedValueOnce({ items: [version], next_cursor: "next" })
      .mockResolvedValueOnce({
        items: [{ ...version, version: "v-two", file_name: "two.xlsx" }],
        next_cursor: null,
      });
    const user = userEvent.setup();
    render(<CatalogManager />);
    await user.click(
      await screen.findByRole("button", { name: "Load more versions" }),
    );
    expect(await screen.findByText("two.xlsx")).toBeInTheDocument();
    expect(screen.getByText("old.xlsx")).toBeInTheDocument();
    expect(repo.versions).toHaveBeenLastCalledWith("next");
    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
  });
  it("shows initial load errors and provides a retry", async () => {
    repo.status.mockRejectedValueOnce({
      code: "FORBIDDEN",
      message: "Forbidden",
    });
    const user = userEvent.setup();
    render(<CatalogManager />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Forbidden");
    await user.click(screen.getByRole("button", { name: "Refresh catalog" }));
    expect(await screen.findByText("Original catalog")).toBeInTheDocument();
  });
  it("keeps a pending operation across navigation and reconciles the original ID", async () => {
    repo.imports.mockRejectedValueOnce({
      code: "TIMEOUT",
      message: "Timed out",
    });
    const user = userEvent.setup();
    const first = render(<CatalogManager />);
    await selectAndValidate(user);
    await confirmReplace(user);
    await screen.findByRole("button", { name: "Check operation status" });
    const id = repo.imports.mock.calls[0][0].operation_id;
    first.unmount();
    render(<CatalogManager />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "previous operation",
    );
    await user.click(
      screen.getByRole("button", { name: "Check operation status" }),
    );
    await screen.findByText("Catalog replaced successfully");
    expect(repo.operation).toHaveBeenCalledWith(id);
    expect(repo.imports).toHaveBeenCalledTimes(1);
    expect(sessionStorage.length).toBe(0);
  });
  it("keeps writes blocked when an operation status query fails", async () => {
    repo.imports.mockRejectedValueOnce({
      code: "SERVER_ERROR",
      message: "Bad Gateway",
    });
    repo.operation.mockRejectedValueOnce({
      code: "NOT_FOUND",
      message: "Operation not found",
    });
    const user = userEvent.setup();
    render(<CatalogManager />);
    await selectAndValidate(user);
    await confirmReplace(user);
    await user.click(
      await screen.findByRole("button", { name: "Check operation status" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Operation not found",
    );
    expect(
      screen.getByRole("button", { name: "Validate file" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Restore old.xlsx" }),
    ).toBeDisabled();
    expect(repo.imports).toHaveBeenCalledTimes(1);
  });
  it.each(["failed", "conflict"] as const)(
    "shows the saved %s operation without claiming success",
    async (status) => {
      repo.imports.mockResolvedValueOnce({
        ...completed,
        status,
        message: "Operation rejected",
        error: "Active revision changed",
      });
      const user = userEvent.setup();
      render(<CatalogManager />);
      await selectAndValidate(user);
      await confirmReplace(user);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Active revision changed",
      );
      expect(
        screen.queryByText("Catalog replaced successfully"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Check operation status" }),
      ).not.toBeInTheDocument();
      expect(repo.imports).toHaveBeenCalledTimes(1);
    },
  );
  it("does not submit twice while the first upload remains unresolved", async () => {
    let resolve!: (value: CatalogOperation) => void;
    repo.imports.mockReturnValueOnce(
      new Promise<CatalogOperation>((done) => {
        resolve = done;
      }),
    );
    const user = userEvent.setup();
    render(<CatalogManager />);
    await selectAndValidate(user);
    await confirmReplace(user);
    expect(screen.getByLabelText("XLSX file")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Check operation status" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Restore old.xlsx" }),
    ).toBeDisabled();
    resolve(completed);
    await screen.findByText("Catalog replaced successfully");
    expect(repo.imports).toHaveBeenCalledTimes(1);
  });
  it("bounds the displayed sample to 20 items even if an upstream response is larger", async () => {
    repo.validate.mockResolvedValueOnce({
      ...preview,
      sample: Array.from({ length: 25 }, (_, index) => ({
        ...preview.sample[0],
        question_code: `Question-${index}`,
      })),
    });
    const user = userEvent.setup();
    render(<CatalogManager />);
    await selectAndValidate(user);
    expect(screen.getAllByRole("row")).toHaveLength(21);
    expect(screen.queryByText("Question-20")).not.toBeInTheDocument();
    expect(screen.getByText("Question-19")).toBeInTheDocument();
  });
  it("rejects an empty local workbook without calling the validation endpoint", async () => {
    const user = userEvent.setup();
    render(<CatalogManager />);
    await screen.findByText("Original catalog");
    await user.upload(
      screen.getByLabelText("XLSX file"),
      new File([], "empty.xlsx"),
    );
    await user.click(screen.getByRole("button", { name: "Validate file" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("non-empty");
    expect(repo.validate).not.toHaveBeenCalled();
  });
  it("marks active history entries and prevents restoring them", async () => {
    repo.versions.mockResolvedValueOnce({
      items: [{ ...version, active: true }],
      next_cursor: null,
    });
    render(<CatalogManager />);
    expect(await screen.findByText("old.xlsx · Active")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Restore old.xlsx" }),
    ).toBeDisabled();
  });
  it("shows an empty history without assuming that active legacy metadata is known", async () => {
    repo.versions.mockResolvedValueOnce({ items: [], next_cursor: null });
    render(<CatalogManager />);
    expect(await screen.findByText("No saved versions.")).toBeInTheDocument();
    expect(screen.getAllByText("Unknown")).toHaveLength(2);
  });

  it("limits warning rendering while showing the remaining warning count", async () => {
    repo.validate.mockResolvedValueOnce({
      ...preview,
      warnings: Array.from(
        { length: 25 },
        (_, index) => `Warning ${index + 1}`,
      ),
    });
    const user = userEvent.setup();
    render(<CatalogManager />);
    await selectAndValidate(user);
    expect(screen.getByText("Warning 20")).toBeInTheDocument();
    expect(screen.queryByText("Warning 21")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "5 additional warnings; review the source file before replacing.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps loaded versions visible when the next history page fails", async () => {
    repo.versions
      .mockResolvedValueOnce({ items: [version], next_cursor: "next" })
      .mockRejectedValueOnce({
        code: "NETWORK_ERROR",
        message: "Could not load more versions",
      });
    const user = userEvent.setup();
    render(<CatalogManager />);
    await user.click(
      await screen.findByRole("button", { name: "Load more versions" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load more versions",
    );
    expect(screen.getByText("old.xlsx")).toBeInTheDocument();
    expect(repo.versions).toHaveBeenCalledTimes(2);
  });
  it("shows an unavailable active status with a recoverable load error", async () => {
    repo.status.mockRejectedValueOnce({
      code: "NETWORK_ERROR",
      message: "Status unavailable",
    });
    render(<CatalogManager />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Status unavailable",
    );
    expect(
      screen.getByText("Catalog status is unavailable."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Validate file" }),
    ).toBeDisabled();
  });
  it("renders missing sample costs as unknown and handles no warnings", async () => {
    repo.validate.mockResolvedValueOnce({
      ...preview,
      warnings: [],
      sample: [{ ...preview.sample[0], cost: null, unit: "unit" }],
    });
    const user = userEvent.setup();
    render(<CatalogManager />);
    await selectAndValidate(user);
    expect(screen.getByRole("cell", { name: "Unknown" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "unit" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Warnings" }),
    ).not.toBeInTheDocument();
  });
  it("shows restore failures without repeating the activation", async () => {
    repo.activate.mockRejectedValueOnce({
      code: "SOME_PROVIDER_CODE",
      message: "Revision conflict",
      details: { status: 409 },
    });
    const user = userEvent.setup();
    render(<CatalogManager />);
    await user.click(
      await screen.findByRole("button", { name: "Restore old.xlsx" }),
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Restore version",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Revision conflict",
    );
    expect(repo.activate).toHaveBeenCalledTimes(1);
    expect(repo.operation).not.toHaveBeenCalled();
  });
  it("does not replace a completed operation with an automatic new write after checking a running result", async () => {
    repo.imports.mockResolvedValueOnce({
      ...completed,
      status: "running",
      message: "Writing rows",
    });
    repo.operation.mockResolvedValueOnce({
      ...completed,
      status: "running",
      message: "Still writing rows",
    });
    const user = userEvent.setup();
    render(<CatalogManager />);
    await selectAndValidate(user);
    await confirmReplace(user);
    await user.click(
      await screen.findByRole("button", { name: "Check operation status" }),
    );
    expect(await screen.findByText("Still writing rows")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Validate file" }),
    ).toBeDisabled();
    expect(repo.imports).toHaveBeenCalledTimes(1);
    expect(repo.operation).toHaveBeenCalledTimes(1);
  });
  it("recovers a never-received upload explicitly with the original UUID, revision and bytes", async () => {
    repo.imports.mockRejectedValueOnce({ code: "NETWORK_ERROR", message: "Never delivered" });
    repo.operation.mockRejectedValueOnce({ code: "NOT_FOUND", message: "Operation not found", details: { status: 404 } });
    const user = userEvent.setup(); render(<CatalogManager />); await selectAndValidate(user); await confirmReplace(user);
    const original = repo.imports.mock.calls[0][0];
    await user.click(await screen.findByRole("button", { name: "Check operation status" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Operation not found");
    expect(repo.imports).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Retry same operation" })).toBeDisabled();
    await user.upload(screen.getByLabelText("Original XLSX file"), workbook());
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry same operation" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Retry same operation" }));
    expect(repo.imports).toHaveBeenCalledTimes(1);
    await user.click(within(screen.getByRole("dialog", { name: "Retry the same catalog operation?" })).getByRole("button", { name: "Retry same operation" }));
    await screen.findByText("Catalog replaced successfully");
    expect(repo.imports).toHaveBeenCalledTimes(2);
    expect(repo.imports.mock.calls[1][0]).toEqual(original);
    expect(repo.validate).toHaveBeenCalledTimes(1);
  });
  it("persists only retry metadata and keeps the original revision after remount and an active-version change", async () => {
    repo.imports.mockRejectedValueOnce({ code: "TIMEOUT", message: "Timed out" });
    const user = userEvent.setup(); const first = render(<CatalogManager />); await selectAndValidate(user); await confirmReplace(user);
    await screen.findByRole("button", { name: "Check operation status" });
    const original = repo.imports.mock.calls[0][0];
    const saved = JSON.parse(sessionStorage.getItem("kma.catalog.pending-operation")!);
    expect(saved).toMatchObject({ id: original.operation_id, kind: "upload", expected_revision: "legacy:0", file_name: "catalog.xlsx", sha256: preview.sha256 });
    expect(saved).not.toHaveProperty("file_content");
    expect(sessionStorage.getItem("kma.catalog.pending-operation")).not.toContain(btoa("xlsx-content"));
    first.unmount();
    repo.status.mockResolvedValue({ ...initialStatus, revision: "newer-revision" });
    repo.operation.mockRejectedValueOnce({ code: "NOT_FOUND", message: "Not found", details: { status: 404 } });
    render(<CatalogManager />);
    await user.click(await screen.findByRole("button", { name: "Check operation status" }));
    await user.upload(await screen.findByLabelText("Original XLSX file"), workbook());
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry same operation" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Retry same operation" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Retry same operation" }));
    await screen.findByText("Catalog replaced successfully");
    expect(repo.imports.mock.calls[1][0]).toEqual(original);
    expect(repo.validate).toHaveBeenCalledTimes(1);
  });
  it("refuses another workbook with the same name before retrying an unknown upload", async () => {
    repo.imports.mockRejectedValueOnce({ code: "NETWORK_ERROR", message: "Disconnected" });
    repo.operation.mockRejectedValueOnce({ code: "NOT_FOUND", message: "Not found" });
    const user = userEvent.setup(); render(<CatalogManager />); await selectAndValidate(user); await confirmReplace(user);
    await user.click(await screen.findByRole("button", { name: "Check operation status" }));
    await user.upload(await screen.findByLabelText("Original XLSX file"), new File(["different-content"], "catalog.xlsx"));
    expect(await screen.findByRole("alert")).toHaveTextContent("does not match the original SHA-256");
    expect(screen.getByRole("button", { name: "Retry same operation" })).toBeDisabled();
    expect(repo.imports).toHaveBeenCalledTimes(1);
    expect(repo.validate).toHaveBeenCalledTimes(1);
  });
  it("retries an unknown restore with its original version and revision after remount", async () => {
    repo.activate.mockRejectedValueOnce({ code: "NETWORK_ERROR", message: "Disconnected" });
    const user = userEvent.setup(); const first = render(<CatalogManager />);
    await user.click(await screen.findByRole("button", { name: "Restore old.xlsx" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Restore version" }));
    await screen.findByRole("button", { name: "Check operation status" });
    const original = repo.activate.mock.calls[0][0];
    first.unmount();
    repo.status.mockResolvedValue({ ...initialStatus, revision: "newer-revision" });
    repo.operation.mockRejectedValueOnce({ code: "NOT_FOUND", message: "Not found" });
    render(<CatalogManager />);
    await user.click(await screen.findByRole("button", { name: "Check operation status" }));
    await user.click(await screen.findByRole("button", { name: "Retry same operation" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Retry same operation" }));
    await screen.findByText("Catalog replaced successfully");
    expect(repo.activate).toHaveBeenCalledTimes(2);
    expect(repo.activate.mock.calls[1][0]).toEqual(original);
    expect(repo.imports).not.toHaveBeenCalled();
  });

});

it("recovers a queued operation in a new tab and polls to completion without another upload", async () => {
  repo.operations.mockResolvedValueOnce({ items: [{ ...completed, operation_id: "recovered", status: "queued", total_items: 10000, processed_items: 0 }], next_cursor: null });
  repo.operation.mockResolvedValueOnce({ ...completed, operation_id: "recovered", total_items: 10000, processed_items: 10000 });
  render(<CatalogManager />);
  expect(await screen.findByText("Catalog operation in progress")).toBeInTheDocument();
  expect(screen.getAllByText("0 / 10,000 records processed").length).toBeGreaterThan(0);
  await waitFor(() => expect(repo.operation).toHaveBeenCalledWith("recovered"), { timeout: 5000 });
  await waitFor(() => expect(screen.queryByText("Catalog operation in progress")).not.toBeInTheDocument());
  expect(repo.imports).not.toHaveBeenCalled();
  expect(repo.status.mock.calls.length).toBeGreaterThan(1);
});
