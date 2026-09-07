// ---------------------------------------------------------------------------
// Tests para sanitizeFileName: elimina caracteres que rompen URLs públicas S3.
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { sanitizeFileName } from "../file";

describe("sanitizeFileName", () => {
  it.each([
    ["#01.jpg", "01.jpg"],
    ["my photo.png", "myphoto.png"],
    ["ok_file-1.jpg", "ok_file-1.jpg"],
    ["a&b?c=d.png", "abcd.png"],
    ["ñandú.jpg", "and.jpg"],
    ["", ""],
    ["....", "...."],
    ["file(1).pdf", "file1.pdf"],
    ["100%_done.txt", "100_done.txt"],
  ])("sanitizes %s into %s", (input, expected) => {
    expect(sanitizeFileName(input)).toBe(expected);
  });
});
