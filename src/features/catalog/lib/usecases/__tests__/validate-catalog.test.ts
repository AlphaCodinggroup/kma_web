import { afterEach, describe, expect, it, vi } from "vitest";
import { validateCatalogFile } from "../validate-catalog";
import type { CatalogRepo } from "../../../api/catalog.repo";

function repository() {
  return {
    validate: vi.fn().mockResolvedValue({ expected_revision: "r1" }),
  } as unknown as CatalogRepo;
}
afterEach(() => vi.unstubAllGlobals());
describe("Validate catalog file", () => {
  it("reads and validates once, retaining exact file bytes and the returned revision", async () => {
    const repo = repository();
    expect(
      await validateCatalogFile(
        repo,
        new File(["spreadsheet"], "catalog.XLSX"),
        3145728,
      ),
    ).toEqual({
      file: { file_name: "catalog.XLSX", file_content: btoa("spreadsheet") },
      preview: { expected_revision: "r1" },
    });
    expect(repo.validate).toHaveBeenCalledTimes(1);
  });
  it.each([
    {
      name: "catalog.csv",
      content: "data",
      max: 3145728,
      message: "Select an XLSX file.",
    },
    { name: "catalog.xlsx", content: "", max: 3145728, message: "non-empty" },
    { name: "catalog.xlsx", content: "larger", max: 3, message: "3 MiB" },
  ])(
    "rejects $name input before calling validation",
    async ({ name, content, max, message }) => {
      const repo = repository();
      await expect(
        validateCatalogFile(repo, new File([content], name), max),
      ).rejects.toThrow(message);
      expect(repo.validate).not.toHaveBeenCalled();
    },
  );
  it("enforces the 3 MiB ceiling even when the status advertises a higher limit", async () => {
    const repo = repository();
    await expect(
      validateCatalogFile(
        repo,
        new File([new Uint8Array(3145729)], "catalog.xlsx"),
        10_000_000,
      ),
    ).rejects.toThrow("3 MiB");
    expect(repo.validate).not.toHaveBeenCalled();
  });
  it.each(["error", "abort", "invalid"] as const)(
    "surfaces file reader %s without calling validation",
    async (outcome) => {
      class Reader {
        result: unknown = null;
        onload?: () => void;
        onerror?: () => void;
        onabort?: () => void;
        readAsDataURL() {
          if (outcome === "error") this.onerror?.();
          else if (outcome === "abort") this.onabort?.();
          else this.onload?.();
        }
      }
      vi.stubGlobal("FileReader", Reader);
      const repo = repository();
      await expect(
        validateCatalogFile(repo, new File(["xlsx"], "catalog.xlsx"), 3145728),
      ).rejects.toThrow(outcome === "abort" ? "canceled" : "Could not read");
      expect(repo.validate).not.toHaveBeenCalled();
    },
  );
});
