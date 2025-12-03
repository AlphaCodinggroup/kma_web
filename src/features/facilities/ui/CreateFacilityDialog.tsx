"use client";

import React from "react";
import FacilityUpsertDialog, {
  type FacilityUpsertValues,
} from "./FacilityUpsertDialog";

export interface CreateFacilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<FacilityUpsertValues> | undefined;
  onSubmit: (values: FacilityUpsertValues) => void | Promise<void>;
  loading?: boolean | undefined;
  error?: string | null | undefined;
  titleOverride?: string | undefined;
  descriptionOverride?: string | undefined;
  submitLabelOverride?: string | undefined;
}

/**
 * Modal reutilizable para CREAR una Facility.
 */
const CreateFacilityDialog: React.FC<CreateFacilityDialogProps> = ({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
  loading,
  error,
  titleOverride,
  descriptionOverride,
  submitLabelOverride,
}) => {
  return (
    <FacilityUpsertDialog
      mode="create"
      open={open}
      onOpenChange={onOpenChange}
      defaultValues={defaultValues}
      loading={loading}
      error={error}
      titleOverride={titleOverride}
      descriptionOverride={descriptionOverride}
      submitLabelOverride={submitLabelOverride}
      onSubmit={onSubmit}
    />
  );
};

export default CreateFacilityDialog;
