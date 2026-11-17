export function errorMessage(value: unknown): string | undefined {
  if (value !== null && typeof value === "object" && "message" in value) {
    return typeof value.message === "string" ? value.message : undefined;
  }
  return undefined;
}
