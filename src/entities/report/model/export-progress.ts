export type ExportPhase =
  | "idle"
  | "queueing"
  | "generating"
  | "downloading"
  | "done"
  | "timeout"
  | "error"
  | "canceled";

export interface ExportProgress {
  phase: ExportPhase;
  percent: number | null;
  message: string;
  bytes: number | null;
  error: Error | null;
}
