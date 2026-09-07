export function estimateGenerationPercent(
  startedAtMs: number,
  nowMs: number,
  estimateMs: number
): number {
  if (estimateMs <= 0) return 89;
  const elapsed = Math.max(0, nowMs - startedAtMs);
  const ratio = Math.min(1, elapsed / estimateMs);
  return Math.min(89, 10 + Math.floor(ratio * 75));
}

export function monotonic(
  previous: number | null,
  next: number | null
): number | null {
  if (next === null) return previous;
  if (previous === null) return next;
  return Math.max(previous, next);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"] as const;
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** unitIndex;
  const precision = unitIndex === 0 || value >= 10 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}
