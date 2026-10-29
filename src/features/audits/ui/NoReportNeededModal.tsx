"use client";

import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@shared/ui/modal";
import { Button } from "@shared/ui/controls";

export interface NoReportNeededModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Aviso para una auditoría conforme: no genera reporte. */
const NoReportNeededModal: React.FC<NoReportNeededModalProps> = ({
  open,
  onOpenChange,
}) => (
  <Modal open={open} onOpenChange={onOpenChange}>
    <ModalContent>
      <ModalHeader>
        <ModalTitle>No Report Needed</ModalTitle>
        <ModalDescription>
          This audit has no findings — all answers are compliant. No report will be generated.
        </ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <Button
          type="button"
          onClick={() => onOpenChange(false)}
        >
          OK
        </Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
);

export default NoReportNeededModal;
