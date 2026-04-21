/**
 * Sanitizes a filename by replacing any character that is NOT
 * alphanumeric, a dot, a hyphen, or an underscore with an empty string.
 *
 * This prevents special characters like `#`, spaces, `&`, etc. from
 * breaking S3 public URLs in the browser (e.g. `#` is interpreted as
 * an anchor fragment and truncates the URL before it reaches S3).
 *
 * @example
 * sanitizeFileName("#01.jpg")      // → "01.jpg"
 * sanitizeFileName("my photo.png") // → "myphoto.png"
 * sanitizeFileName("ok_file-1.jpg")// → "ok_file-1.jpg"  (unchanged)
 */
export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "");
}
