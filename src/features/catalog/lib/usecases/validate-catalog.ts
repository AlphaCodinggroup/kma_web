import type { CatalogRepo } from "../../api/catalog.repo";
import type {
  CatalogFile,
  CatalogPreview,
} from "@entities/catalog/model/catalog";

/** La lectura local permite recuperar una petición sin cambiar su revisión. */
export async function readCatalogFile(file: File, maxBytes: number): Promise<CatalogFile> {
  if (!/\.xlsx$/i.test(file.name)) throw new Error("Select an XLSX file.");
  if (!file.size || file.size > Math.min(maxBytes, 3145728))
    throw new Error(
      "The XLSX file must be non-empty and no larger than 3 MiB.",
    );
  const file_content = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string" || !result.includes(","))
        return reject(new Error("Could not read the selected file."));
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () =>
      reject(new Error("Could not read the selected file."));
    reader.onabort = () => reject(new Error("File reading was canceled."));
    reader.readAsDataURL(file);
  });
  return { file_name: file.name, file_content };
}

/** Leer y validar no modifica el catálogo; el reemplazo es otro caso de uso. */
export async function validateCatalogFile(repo: CatalogRepo, file: File, maxBytes: number): Promise<{ file: CatalogFile; preview: CatalogPreview }> {
  const input = await readCatalogFile(file, maxBytes);
  return { file: input, preview: await repo.validate(input) };
}

export async function catalogFileSha256(file: CatalogFile): Promise<string> {
  const bytes = Uint8Array.from(atob(file.file_content), char => char.charCodeAt(0));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
