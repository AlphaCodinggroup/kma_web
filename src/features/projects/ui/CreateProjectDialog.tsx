"use client";

import React from "react";
import ProjectUpsertDialog, {
  type Option,
  type ProjectUpsertValues,
} from "./ProjectsUpsertDialog";
import type { UserSummary } from "@entities/user/list.model";

export interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auditors: UserSummary[];
  facilities: Option[];
  defaultValues?: Partial<ProjectUpsertValues> | undefined;
  onSubmit: (values: ProjectUpsertValues) => void | Promise<void>;
  loading?: boolean | undefined;
  error?: string | null | undefined;
  titleOverride?: string | undefined;
  descriptionOverride?: string | undefined;
  submitLabelOverride?: string | undefined;
}

const CreateProjectDialog: React.FC<CreateProjectDialogProps> = ({
  open,
  onOpenChange,
  auditors,
  facilities,
  defaultValues,
  onSubmit,
  loading,
  error,
  titleOverride,
  descriptionOverride,
  submitLabelOverride,
}) => {
  return (
    <ProjectUpsertDialog
      mode="create"
      open={open}
      onOpenChange={onOpenChange}
      defaultValues={defaultValues}
      auditors={auditors}
      facilities={facilities}
      loading={loading}
      error={error}
      titleOverride={titleOverride}
      descriptionOverride={descriptionOverride}
      submitLabelOverride={submitLabelOverride}
      onSubmit={onSubmit}
    />
  );
};

export default CreateProjectDialog;
