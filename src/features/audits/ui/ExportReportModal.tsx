"use client";

import { CheckCircle2 } from "lucide-react";
import type { ExportProgress } from "@entities/report/model/export-progress";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@shared/ui/modal";
import { ProgressRing } from "@shared/ui/progress";
import { Button } from "@shared/ui/controls";
import { Retry } from "@shared/ui/Retry";
import { formatBytes } from "@shared/lib/report-progress";

type Props = {
  open: boolean;
  progress: ExportProgress;
  filename: string;
  onStop: () => void;
  onRetry: () => void;
  onClose: () => void;
};

const isActive = (progress: ExportProgress) =>
  progress.phase === "queueing" ||
  progress.phase === "generating" ||
  progress.phase === "downloading";

export default function ExportReportModal({
  open,
  progress,
  filename,
  onStop,
  onRetry,
  onClose,
}: Props) {
  const active = isActive(progress);

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !active) onClose();
      }}
      closeOnEsc={!active}
      closeOnOverlay={!active}
    >
      <ModalContent className="max-w-md text-center">
        <ModalHeader>
          <ModalTitle>
            {progress.phase === "done"
              ? "Report ready"
              : progress.phase === "error"
                ? "Export failed"
                : progress.phase === "timeout"
                  ? "Still working"
                  : progress.phase === "canceled"
                    ? "Waiting stopped"
                    : "Exporting report"}
          </ModalTitle>
          <ModalDescription>
            The PDF can take a moment when it includes many photos.
          </ModalDescription>
        </ModalHeader>

        <div className="flex flex-col items-center gap-4">
          {progress.phase === "done" ? (
            <CheckCircle2
              className="h-24 w-24 text-[var(--kma-primary)]"
              aria-hidden="true"
            />
          ) : progress.phase === "error" ? (
            <Retry
              text={progress.message}
              textButton="Retry"
              onClick={onRetry}
            />
          ) : (
            <ProgressRing
              value={progress.percent}
              label="Report export progress"
            />
          )}

          <p role="status" aria-live="polite" className="min-h-6 text-gray-700">
            {progress.message}
          </p>

          {progress.phase === "done" ? (
            <div className="text-sm text-gray-600">
              <p className="font-medium text-black">{filename}</p>
              {progress.bytes !== null ? <p>{formatBytes(progress.bytes)}</p> : null}
            </div>
          ) : null}
        </div>

        <ModalFooter className="justify-center">
          {active ? (
            <Button type="button" onClick={onStop} className="w-auto">
              Stop waiting
            </Button>
          ) : progress.phase !== "error" ? (
            <Button type="button" onClick={onClose} className="w-auto">
              Close
            </Button>
          ) : null}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
